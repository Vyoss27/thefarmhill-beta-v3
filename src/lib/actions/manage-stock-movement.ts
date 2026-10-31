"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentStaff } from "@/lib/auth";
import { stockUnitId } from "@/lib/stock-target";

async function requireAdmin() {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false as const, error: "Sesi login habis, silakan masuk lagi." };
  if (staff.role !== "admin") return { ok: false as const, error: "Cuma admin yang bisa mencatat stok keluar." };
  return { ok: true as const, staff };
}

const WASTE_KINDS = ["waste_kulit", "waste_busuk", "waste_reject"] as const;

const schema = z.object({
  productId: z.string().uuid(),
  saleUnitId: z.string().uuid().optional(),
  jenis: z.enum([...WASTE_KINDS, "penyesuaian"]),
  arah: z.enum(["kurang", "tambah"]).default("kurang"),
  jumlah: z.coerce.number().positive("Jumlah harus lebih dari 0"),
  catatan: z.string().min(1, "Catatan/alasan wajib diisi"),
});

/**
 * Catat stok keluar manual (waste) atau koreksi opname — pasangan "OUT" dari
 * recordStockBatch ("IN"). Gantinya updateSaleUnitStock (overwrite polos tanpa
 * alasan). Waste selalu mengurangi; penyesuaian boleh nambah/mengurangi sesuai
 * `arah`, dipakai waktu hasil hitung fisik beda dari catatan sistem.
 */
export async function recordStockMovement(input: z.infer<typeof schema>) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  const data = parsed.data;

  // Tingkat harga Perfect berbagi satu kolam stok — catat ke kolamnya, bukan ke tingkatnya.
  let saleUnitId = data.saleUnitId;
  if (saleUnitId) {
    const dipilih = await db.saleUnit.findUnique({ where: { id: saleUnitId }, select: { id: true, stokUnitId: true } });
    if (dipilih) saleUnitId = stockUnitId(dipilih);
  }

  const isWaste = (WASTE_KINDS as readonly string[]).includes(data.jenis);
  // Waste selalu pengurangan; penyesuaian ikut arah yang dipilih admin.
  const perubahan = isWaste || data.arah === "kurang" ? -data.jumlah : data.jumlah;

  try {
    await db.$transaction(async (tx) => {
      const product = await tx.product.findUnique({ where: { id: data.productId } });
      if (!product) throw new Error("Produk tidak ditemukan.");

      if (saleUnitId) {
        const unit = await tx.saleUnit.findUnique({ where: { id: saleUnitId }, include: { stock: true } });
        if (!unit || unit.productId !== data.productId) throw new Error("Satuan jual tidak ditemukan di produk ini.");

        if (perubahan < 0) {
          const tersedia = Number(unit.stock?.jumlah ?? 0) - Number(unit.stock?.ditahan ?? 0);
          if (tersedia < -perubahan) {
            throw new Error(`Stok tersedia cuma ${Math.max(tersedia, 0)} — tidak bisa keluarkan ${-perubahan}.`);
          }
        }

        await tx.saleUnitStock.upsert({
          where: { saleUnitId: saleUnitId },
          update: { jumlah: { increment: perubahan } },
          create: { saleUnitId: saleUnitId, jumlah: Math.max(perubahan, 0), ditahan: 0 },
        });
      } else {
        const stock = await tx.stock.findUnique({ where: { productId: data.productId } });
        if (perubahan < 0) {
          const tersedia = Number(stock?.jumlah ?? 0) - Number(stock?.ditahan ?? 0);
          if (tersedia < -perubahan) {
            throw new Error(`Stok tersedia cuma ${Math.max(tersedia, 0)} — tidak bisa keluarkan ${-perubahan}.`);
          }
        }

        await tx.stock.upsert({
          where: { productId: data.productId },
          update: { jumlah: { increment: perubahan } },
          create: { productId: data.productId, jumlah: Math.max(perubahan, 0), ditahan: 0 },
        });
      }

      await tx.stockMovement.create({
        data: {
          productId: data.productId,
          saleUnitId: saleUnitId ?? null,
          jenis: data.jenis,
          perubahan,
          catatan: data.catatan,
          dicatatOlehId: auth.staff.id,
        },
      });

      await tx.actionLog.create({
        data: {
          entitas: "product",
          entitasId: data.productId,
          actorId: auth.staff.id,
          aksi: isWaste ? "stok_keluar" : "stok_penyesuaian",
          nilaiBaru: { saleUnitId: saleUnitId ?? null, jenis: data.jenis, perubahan, catatan: data.catatan },
        },
      });
    });
  } catch (err) {
    return { ok: false as const, error: err instanceof Error ? err.message : "Gagal mencatat stok keluar." };
  }

  revalidatePath("/admin/stok");
  return { ok: true as const };
}
