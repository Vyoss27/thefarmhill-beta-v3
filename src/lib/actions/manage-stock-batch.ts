"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentStaff } from "@/lib/auth";
import { INTAKE_GRADES, type IntakeGradeKode } from "@/lib/melon-grade";
import { activateIfSellable } from "@/lib/product-status";

const MELON_CATEGORIES = new Set(["melon", "paket_melon"]);

async function requireAdmin() {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false as const, error: "Sesi login habis, silakan masuk lagi." };
  if (staff.role !== "admin") return { ok: false as const, error: "Cuma admin yang bisa mencatat stok masuk." };
  return { ok: true as const, staff };
}

const schema = z.object({
  productId: z.string().uuid(),
  saleUnitId: z.string().uuid().optional(),
  jumlah: z.coerce.number().positive("Jumlah harus lebih dari 0"),
  tanggalMasuk: z.string().min(1, "Tanggal wajib diisi"),
  bestBefore: z.string().optional(),
  grade: z.string().optional(),
  brix: z.coerce.number().optional(),
  lokasiSimpan: z.string().optional(),
  catatan: z.string().optional(),
});

/**
 * Catat barang masuk (StockBatch) sekaligus nambah stok berjalan. Untuk produk
 * per-ukuran (melon), batch wajib ditujukan ke satu SaleUnit (size) tertentu —
 * update SaleUnitStock.jumlah, bukan Stock.jumlah agregat. Produk biasa update
 * Stock.jumlah seperti biasa.
 *
 * Produk melon/paket_melon wajib isi grade panen (perfect/imperfect/outspec —
 * lihat src/lib/melon-grade.ts). Grade "perfect" wajib diarahkan ke SaleUnit
 * berukuran (sortir ke size); "imperfect"/"outspec" diarahkan ke SaleUnit flat
 * (non-size) kalau produk itu punya, atau ke Stock agregat kalau tidak.
 */
export async function recordStockBatch(input: z.infer<typeof schema>) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  const data = parsed.data;

  const product = await db.product.findUnique({ where: { id: data.productId }, include: { saleUnits: true } });
  if (!product) return { ok: false as const, error: "Produk tidak ditemukan." };

  const isMelon = MELON_CATEGORIES.has(product.jenisItem);
  const sizeUnits = product.saleUnits.filter((u) => u.ukuran);
  const flatUnits = product.saleUnits.filter((u) => !u.ukuran);

  if (isMelon) {
    if (!data.grade || !INTAKE_GRADES.some((g) => g.kode === data.grade)) {
      return { ok: false as const, error: "Pilih grade panen (Perfect/Imperfect/Outspec) untuk produk melon." };
    }
    const grade = data.grade as IntakeGradeKode;
    if (grade === "perfect") {
      // Stok Perfect satu kolam (tingkat size hanya beda harga) — selalu masuk ke unit Perfect tanpa size.
      const kolam = product.saleUnits.find((u) => u.grade === "perfect" && !u.ukuran);
      if (!kolam) return { ok: false as const, error: "Produk ini belum punya unit Perfect." };
      const dipilih = data.saleUnitId ? product.saleUnits.find((u) => u.id === data.saleUnitId) : null;
      if (data.saleUnitId && dipilih?.grade !== "perfect") {
        return { ok: false as const, error: "Satuan yang dipilih bukan unit Perfect produk ini." };
      }
      data.saleUnitId = kolam.id;
    } else if (data.saleUnitId && !flatUnits.find((u) => u.id === data.saleUnitId)) {
      return { ok: false as const, error: "Satuan yang dipilih tidak cocok untuk grade Imperfect/Outspec." };
    }
  } else if (data.saleUnitId) {
    if (sizeUnits.length === 0) return { ok: false as const, error: "Produk ini tidak dijual per-ukuran." };
    if (!sizeUnits.find((u) => u.id === data.saleUnitId)) {
      return { ok: false as const, error: "Size yang dipilih tidak ditemukan di produk ini." };
    }
  }

  await db.$transaction(async (tx) => {
    const batch = await tx.stockBatch.create({
      data: {
        productId: data.productId,
        saleUnitId: data.saleUnitId ?? null,
        tanggalMasuk: new Date(`${data.tanggalMasuk}T00:00:00Z`),
        bestBefore: data.bestBefore ? new Date(`${data.bestBefore}T00:00:00Z`) : null,
        grade: data.grade || null,
        brix: data.brix ?? null,
        jumlah: data.jumlah,
        lokasiSimpan: data.lokasiSimpan || null,
        catatan: data.catatan || null,
        dicatatOlehId: auth.staff.id,
      },
    });

    if (data.saleUnitId) {
      await tx.saleUnitStock.upsert({
        where: { saleUnitId: data.saleUnitId },
        update: { jumlah: { increment: data.jumlah } },
        create: { saleUnitId: data.saleUnitId, jumlah: data.jumlah, ditahan: 0 },
      });
    } else {
      await tx.stock.upsert({
        where: { productId: data.productId },
        update: { jumlah: { increment: data.jumlah } },
        create: { productId: data.productId, jumlah: data.jumlah, ditahan: 0 },
      });
    }
    await activateIfSellable(tx, data.productId);

    await tx.actionLog.create({
      data: {
        entitas: "product",
        entitasId: data.productId,
        actorId: auth.staff.id,
        aksi: "stok_masuk",
        nilaiBaru: { batchId: batch.id, saleUnitId: data.saleUnitId ?? null, jumlah: data.jumlah },
      },
    });
  });

  revalidatePath("/admin/stok");
  return { ok: true as const };
}
