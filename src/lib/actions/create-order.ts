"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { sendWhatsApp } from "@/lib/whatsapp";
import { formatRupiah } from "@/lib/catalog";
import { JAM_SLOT_KOSONG } from "@/lib/slot";
import { resolveVoucherDiscount } from "@/lib/voucher";
import { melonSizeAvgKg, melonSizeMinKg } from "@/lib/melon-size";
import { stockUnitId, usesUnitStock } from "@/lib/stock-target";

const cartItemSchema = z
  .object({
    saleUnitId: z.string().uuid(),
    // Produk biasa (bukan per-ukuran): qty = jumlah satuan.
    qty: z.number().int().positive().optional(),
    // Item per-ukuran (melon) mode "butir": jumlah buah, dikonversi ke kg di server.
    butirDiminta: z.number().int().positive().optional(),
    // Item per-ukuran mode "kg": berat diminta langsung (kg).
    kgDiminta: z.number().positive().optional(),
  })
  .refine((v) => v.qty !== undefined || v.butirDiminta !== undefined || v.kgDiminta !== undefined, {
    message: "Jumlah item tidak valid.",
  });

const createOrderSchema = z.object({
  nama: z.string().min(2, "Nama minimal 2 karakter"),
  wa: z.string().min(8, "Nomor WhatsApp tidak valid"),
  alamat: z.string().min(1, "Alamat wajib diisi untuk pengiriman driver/ekspedisi").optional().or(z.literal("")),
  tanggalSlot: z.string().min(1, "Tanggal wajib dipilih"),
  metodeTerima: z.enum(["driver", "ambil_sendiri", "ekspedisi"]),
  items: z.array(cartItemSchema).min(1, "Keranjang kosong"),
  voucherKode: z.string().optional(),
});

export type CreateOrderInput = z.infer<typeof createOrderSchema>;

export type CreateOrderResult = { ok: true; orderId: string } | { ok: false; error: string };

export async function createOrder(input: CreateOrderInput): Promise<CreateOrderResult> {
  const parsed = createOrderSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  }
  const data = parsed.data;

  if (data.metodeTerima !== "ambil_sendiri" && !data.alamat) {
    return { ok: false, error: "Alamat wajib diisi untuk metode driver/ekspedisi" };
  }

  // Pakai UTC eksplisit — hindari geser satu hari kalau server jalan di timezone
  // beda dari WIB (mis. Vercel default UTC).
  const requestedDate = new Date(`${data.tanggalSlot}T00:00:00Z`);
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" }); // YYYY-MM-DD
  const today = new Date(`${todayStr}T00:00:00Z`);
  if (requestedDate < today) {
    return { ok: false, error: "Tanggal kirim tidak boleh sebelum hari ini" };
  }

  // Tidak ada cut-off, pilihan jam, maupun batas kapasitas (keputusan 2026-10-12): pelanggan hanya
  // memilih tanggal kirim, dan tanggalnya tidak boleh sebelum hari ini (dicek di atas).

  try {
    const created = await db.$transaction(async (tx) => {
      const saleUnits = await tx.saleUnit.findMany({
        where: { id: { in: data.items.map((i) => i.saleUnitId) } },
        include: { product: { include: { stock: true } }, stock: true, stokUnit: { include: { stock: true } } },
      });

      const orderItemsData: {
        saleUnitId: string;
        qty: number;
        butirDiminta: number | null;
        hargaSaatPesan: number;
      }[] = [];

      for (const item of data.items) {
        const unit = saleUnits.find((u) => u.id === item.saleUnitId);
        if (!unit) throw new Error("Salah satu item di keranjang sudah tidak tersedia.");

        if (unit.ukuran) {
          // Item per-ukuran (mis. melon per size): qty (kg) dihitung ulang di server —
          // jangan pernah percaya konversi butir->kg dari client. Harga finalnya juga
          // baru pasti setelah sales timbang berat aktual (OrderItem.beratAktual),
          // jadi tidak ikut dijumlah ke subtotal di sini.
          let qtyKg: number;
          let butirDiminta: number | null = null;

          if (item.kgDiminta !== undefined) {
            const minKg = melonSizeMinKg(unit.ukuran) ?? 0;
            if (item.kgDiminta < minKg) {
              throw new Error(`Minimal pembelian "${unit.product.nama} · ${unit.ukuran}" adalah ${minKg} kg.`);
            }
            qtyKg = Math.round(item.kgDiminta * 100) / 100;
          } else if (item.butirDiminta !== undefined) {
            const avgKg = melonSizeAvgKg(unit.ukuran) ?? 0;
            qtyKg = Math.round(item.butirDiminta * avgKg * 100) / 100;
            butirDiminta = item.butirDiminta;
          } else {
            throw new Error(`Pilih mode butir atau kg untuk "${unit.product.nama} · ${unit.ukuran}".`);
          }

          const kolam = (unit.stokUnit ?? unit).stock; // tingkat harga Perfect berbagi satu kolam stok
          const tersedia = Number(kolam?.jumlah ?? 0) - Number(kolam?.ditahan ?? 0);
          if (unit.product.status !== "aktif" || tersedia < qtyKg) {
            throw new Error(`Stok "${unit.product.nama} · ${unit.ukuran}" tidak mencukupi — sisa ${Math.max(tersedia, 0)} kg.`);
          }

          orderItemsData.push({ saleUnitId: unit.id, qty: qtyKg, butirDiminta, hargaSaatPesan: Number(unit.harga) });
        } else {
          if (item.qty === undefined) throw new Error(`Jumlah untuk "${unit.product.nama}" tidak valid.`);
          const stok = usesUnitStock(unit) ? (unit.stokUnit ?? unit).stock : unit.product.stock;
          const tersedia = Number(stok?.jumlah ?? 0) - Number(stok?.ditahan ?? 0);
          if (unit.product.status !== "aktif" || tersedia < item.qty) {
            throw new Error(`Stok "${unit.product.nama}" tidak mencukupi — sisa ${Math.max(tersedia, 0)} ${unit.satuan}.`);
          }
          orderItemsData.push({ saleUnitId: unit.id, qty: item.qty, butirDiminta: null, hargaSaatPesan: Number(unit.harga) });
        }
      }

      const subtotal = orderItemsData.reduce((sum, i) => {
        const unit = saleUnits.find((u) => u.id === i.saleUnitId)!;
        return unit.ukuran ? sum : sum + i.hargaSaatPesan * i.qty;
      }, 0);

      let diskon = 0;
      let voucherId: string | null = null;
      if (data.voucherKode) {
        const voucherCheck = await resolveVoucherDiscount(tx, data.voucherKode, subtotal);
        if (!voucherCheck.ok) throw new Error(voucherCheck.error);
        diskon = voucherCheck.diskon;
        voucherId = voucherCheck.voucherId;
      }

      const customer = await tx.customer.upsert({
        where: { wa: data.wa },
        update: { nama: data.nama, alamat: data.alamat || undefined },
        create: { nama: data.nama, wa: data.wa, alamat: data.alamat || undefined },
      });

      const order = await tx.order.create({
        data: {
          customerId: customer.id,
          status: "menunggu_konfirmasi",
          subtotal,
          diskon,
          total: subtotal - diskon,
          tanggalSlot: requestedDate,
          jamSlot: JAM_SLOT_KOSONG,
          metodeTerima: data.metodeTerima,
          items: { create: orderItemsData },
        },
      });

      if (voucherId) {
        await tx.voucherUsage.create({ data: { voucherId, orderId: order.id } });
      }

      for (const item of orderItemsData) {
        const unit = saleUnits.find((u) => u.id === item.saleUnitId)!;
        if (usesUnitStock(unit)) {
          await tx.saleUnitStock.update({
            where: { saleUnitId: stockUnitId(unit) },
            data: { ditahan: { increment: item.qty } },
          });
        } else {
          await tx.stock.update({
            where: { productId: unit.productId },
            data: { ditahan: { increment: item.qty } },
          });
        }
      }

      await tx.actionLog.create({
        data: {
          entitas: "order",
          entitasId: order.id,
          aksi: "pesanan_dibuat",
          nilaiBaru: { status: "menunggu_konfirmasi", subtotal },
        },
      });

      const perluTimbangCount = orderItemsData.filter((i) => saleUnits.find((u) => u.id === i.saleUnitId)!.ukuran).length;

      return { id: order.id, subtotal, itemCount: orderItemsData.length, perluTimbangCount };
    });

    const adminWa = process.env.ADMIN_WHATSAPP_NUMBER;
    if (adminWa) {
      const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const timbangNote = created.perluTimbangCount > 0 ? `\n(${created.perluTimbangCount} item menunggu ditimbang — subtotal belum final)` : "";
      await sendWhatsApp(
        adminWa,
        `Pesanan baru dari ${data.nama} (${data.wa})\n${created.itemCount} item · subtotal ${formatRupiah(created.subtotal)}${timbangNote}\nKonfirmasi di: ${appUrl}/admin/pesanan/${created.id}`
      );
    }

    return { ok: true, orderId: created.id };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Gagal membuat pesanan, coba lagi." };
  }
}
