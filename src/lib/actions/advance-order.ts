"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { stockUnitId, usesUnitStock } from "@/lib/stock-target";
import { getCurrentStaff } from "@/lib/auth";
import { sendWhatsApp } from "@/lib/whatsapp";

const TRANSITIONS = {
  diproses: { to: "dikirim", pesan: "Pesananmu di Farmhill Store sudah dikirim / siap diambil sesuai slot yang dipilih." },
  dikirim: { to: "selesai", pesan: "Pesananmu di Farmhill Store sudah selesai. Terima kasih sudah belanja buah segar!" },
} as const;

const schema = z.object({ orderId: z.string().uuid() });

/** Majukan status pesanan satu tahap (diproses -> dikirim -> selesai). */
export async function advanceOrderStatus(input: z.infer<typeof schema>) {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false as const, error: "Sesi login habis, silakan masuk lagi." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Data tidak valid." };

  const order = await db.order.findUnique({
    where: { id: parsed.data.orderId },
    include: { customer: true, items: { include: { saleUnit: true } } },
  });
  if (!order) return { ok: false as const, error: "Pesanan tidak ditemukan." };

  const transition = TRANSITIONS[order.status as keyof typeof TRANSITIONS];
  if (!transition) return { ok: false as const, error: "Status pesanan ini tidak bisa dimajukan dari sini." };

  await db.$transaction(async (tx) => {
    await tx.order.update({ where: { id: order.id }, data: { status: transition.to } });

    // Barang beneran keluar gudang di transisi diproses -> dikirim — lepas hold
    // (ditahan) dan kurangi stok permanen (jumlah) sekaligus, plus catat StockMovement
    // "terjual" biar bisa ditelusuri. Sebelum ini, jumlah tidak pernah dikurangi
    // waktu order selesai — cuma ditahan yang naik/turun.
    if (order.status === "diproses" && transition.to === "dikirim") {
      for (const item of order.items) {
        const qtyActual = Number(item.beratAktual ?? item.qty);
        if (usesUnitStock(item.saleUnit)) {
          await tx.saleUnitStock.update({
            where: { saleUnitId: stockUnitId(item.saleUnit) },
            data: { ditahan: { decrement: Number(item.qty) }, jumlah: { decrement: qtyActual } },
          });
        } else {
          await tx.stock.update({
            where: { productId: item.saleUnit.productId },
            data: { ditahan: { decrement: Number(item.qty) }, jumlah: { decrement: qtyActual } },
          });
        }
        await tx.stockMovement.create({
          data: {
            productId: item.saleUnit.productId,
            saleUnitId: stockUnitId(item.saleUnit),
            orderId: order.id,
            jenis: "terjual",
            perubahan: -qtyActual,
          },
        });
      }
    }

    await tx.actionLog.create({
      data: {
        entitas: "order",
        entitasId: order.id,
        actorId: staff.id,
        aksi: "status_dimajukan",
        nilaiLama: { status: order.status },
        nilaiBaru: { status: transition.to },
      },
    });
  });

  revalidatePath("/admin/pesanan");
  revalidatePath(`/admin/pesanan/${order.id}`);
  revalidatePath(`/pesanan/${order.id}`);

  await sendWhatsApp(order.customer.wa, `Halo ${order.customer.nama}, ${transition.pesan}`);

  return { ok: true as const };
}
