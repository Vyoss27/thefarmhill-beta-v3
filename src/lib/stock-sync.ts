import { Prisma } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { INTAKE_GRADES } from "@/lib/melon-grade";
import { activateIfSellable } from "@/lib/product-status";
import { stockUnitId } from "@/lib/stock-target";

/**
 * Sinkron stok in/out dari Google Sheet ke Supabase (lihat scripts/sheet-sync/README.md).
 *
 * Sheet jadi pintu input harian, tapi saldo tetap dihitung di database: tiap baris
 * sheet masuk sebagai StockBatch (IN) atau StockMovement (OUT) — tabel ledger yang
 * sama dengan form admin — dengan `externalId` unik supaya sinkron aman diulang.
 * Aturan grade/size sengaja meniru recordStockBatch & recordStockMovement.
 */

const MELON_CATEGORIES = new Set(["melon", "paket_melon"]);
const OUT_KINDS = ["terjual", "waste_kulit", "waste_busuk", "waste_reject", "penyesuaian"] as const;

const rowSchema = z.object({
  id: z.string().min(8).max(100),
  tipe: z.enum(["IN", "OUT"]),
  sku: z.string().min(1),
  grade: z.string().nullish(),
  ukuran: z.string().nullish(),
  jumlah: z.coerce.number().refine((n) => Number.isFinite(n), "Jumlah tidak valid"),
  tanggal: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Tanggal harus yyyy-mm-dd"),
  jenis: z.enum(OUT_KINDS).nullish(),
  catatan: z.string().max(500).nullish(),
});

export type SyncRow = z.input<typeof rowSchema>;
export type SyncResult = { id: string; status: "ok" | "duplicate" | "error"; message?: string };

class RowError extends Error {}

type ProductWithUnits = Prisma.ProductGetPayload<{ include: { saleUnits: true } }>;

function normalizeSize(raw: string | null | undefined) {
  const v = (raw ?? "").trim().toUpperCase();
  if (!v) return null;
  return v === "JUMBO" ? "JB" : v;
}

/**
 * Tentukan tujuan stok: SaleUnit tertentu, atau null = Stock agregat produk.
 * Melon: perfect wajib size, imperfect/outspec ke unit non-size kalau ada.
 */
function resolveUnitId(product: ProductWithUnits, grade: string | null, size: string | null) {
  const isMelon = MELON_CATEGORIES.has(product.jenisItem);

  if (!isMelon) {
    if (!size) return { unitId: null, grade: null };
    const unit = product.saleUnits.find((u) => u.ukuran === size);
    if (!unit) throw new RowError(`Size ${size} tidak ada di produk ${product.nama}.`);
    return { unitId: unit.id, grade: null };
  }

  if (!grade || !INTAKE_GRADES.some((g) => g.kode === grade)) {
    throw new RowError("Grade harus PERFECT, IMPERFECT, atau OUTSPEC untuk produk melon.");
  }
  if (grade === "perfect") {
    if (!size) {
      // Sheet belum mencatat size: masuk ke unit "Perfect tanpa size" (unit lama yang tidak ikut
      // dijual di toko). Cukup untuk membandingkan saldo dengan sheet selama masa paralel;
      // begitu gudang mulai mencatat SIZE, baris barunya otomatis ke unit size.
      const unsized = product.saleUnits.find((u) => u.grade === "perfect" && !u.ukuran);
      if (!unsized) throw new RowError(`${product.nama} belum punya unit Perfect tanpa size — isi kolom SIZE (S/M/L/XL/JB).`);
      return { unitId: unsized.id, grade };
    }
    const unit = product.saleUnits.find((u) => u.grade === "perfect" && u.ukuran === size);
    if (!unit) throw new RowError(`Size ${size} tidak ada untuk ${product.nama} grade Perfect.`);
    // Tingkat harga size berbagi satu kolam stok Perfect.
    return { unitId: stockUnitId(unit), grade };
  }
  const flat = product.saleUnits.find((u) => !u.ukuran && u.grade === grade);
  return { unitId: flat?.id ?? null, grade };
}

async function applyRow(row: z.infer<typeof rowSchema>, product: ProductWithUnits): Promise<SyncResult> {
  const grade = row.grade ? row.grade.trim().toLowerCase() : null;
  const { unitId, grade: batchGrade } = resolveUnitId(product, grade, normalizeSize(row.ukuran));
  const tanggal = new Date(`${row.tanggal}T00:00:00Z`);

  if (row.tipe === "IN") {
    if (row.jumlah <= 0) throw new RowError("Jumlah stok masuk harus lebih dari 0.");
    if (await db.stockBatch.findUnique({ where: { externalId: row.id }, select: { id: true } })) {
      return { id: row.id, status: "duplicate" };
    }

    await db.$transaction(async (tx) => {
      const batch = await tx.stockBatch.create({
        data: {
          productId: product.id,
          saleUnitId: unitId,
          tanggalMasuk: tanggal,
          grade: batchGrade,
          jumlah: row.jumlah,
          catatan: row.catatan || null,
          externalId: row.id,
        },
      });

      if (unitId) {
        await tx.saleUnitStock.upsert({
          where: { saleUnitId: unitId },
          update: { jumlah: { increment: row.jumlah } },
          create: { saleUnitId: unitId, jumlah: row.jumlah, ditahan: 0 },
        });
      } else {
        await tx.stock.upsert({
          where: { productId: product.id },
          update: { jumlah: { increment: row.jumlah } },
          create: { productId: product.id, jumlah: row.jumlah, ditahan: 0 },
        });
      }
      await activateIfSellable(tx, product.id);

      await tx.actionLog.create({
        data: {
          entitas: "product",
          entitasId: product.id,
          aksi: "stok_masuk_sheet",
          nilaiBaru: { batchId: batch.id, externalId: row.id, saleUnitId: unitId, jumlah: row.jumlah },
        },
      });
    });
    return { id: row.id, status: "ok" };
  }

  // OUT
  if (!row.jenis) throw new RowError("Jenis stok keluar wajib diisi.");
  const isAdjustment = row.jenis === "penyesuaian";
  if (!isAdjustment && row.jumlah <= 0) throw new RowError("Jumlah stok keluar harus lebih dari 0.");
  if (isAdjustment && row.jumlah === 0) throw new RowError("Jumlah penyesuaian tidak boleh 0.");
  const perubahan = isAdjustment ? row.jumlah : -row.jumlah;

  if (await db.stockMovement.findUnique({ where: { externalId: row.id }, select: { id: true } })) {
    return { id: row.id, status: "duplicate" };
  }

  // Beda dengan form admin: baris sheet tidak ditolak kalau stok app kurang — selama
  // masa paralel sheet adalah pegangan utama, jadi selisih ditampilkan sebagai
  // peringatan (biasanya saldo awal app belum sama dengan sheet), bukan dibuang.
  const saldo = await db.$transaction(async (tx) => {
    const updated = unitId
      ? await tx.saleUnitStock.upsert({
          where: { saleUnitId: unitId },
          update: { jumlah: { increment: perubahan } },
          create: { saleUnitId: unitId, jumlah: perubahan, ditahan: 0 },
        })
      : await tx.stock.upsert({
          where: { productId: product.id },
          update: { jumlah: { increment: perubahan } },
          create: { productId: product.id, jumlah: perubahan, ditahan: 0 },
        });

    await tx.stockMovement.create({
      data: {
        productId: product.id,
        saleUnitId: unitId,
        jenis: row.jenis!,
        perubahan,
        tanggal,
        catatan: row.catatan || null,
        externalId: row.id,
      },
    });

    await tx.actionLog.create({
      data: {
        entitas: "product",
        entitasId: product.id,
        aksi: isAdjustment ? "stok_penyesuaian_sheet" : "stok_keluar_sheet",
        nilaiBaru: { externalId: row.id, saleUnitId: unitId, jenis: row.jenis, perubahan },
      },
    });

    return Number(updated.jumlah) - Number(updated.ditahan);
  });

  if (saldo < 0) {
    return { id: row.id, status: "ok", message: `Stok tersedia di app jadi ${saldo.toFixed(2)} — cek saldo awal.` };
  }
  return { id: row.id, status: "ok" };
}

/** Proses baris berurutan (urutan penting untuk produk yang sama); satu baris gagal tidak menghentikan sisanya. */
export async function syncStockRows(rawRows: unknown[]): Promise<SyncResult[]> {
  const parsed = rawRows.map((raw) => {
    const r = rowSchema.safeParse(raw);
    return r.success
      ? { ok: true as const, row: r.data }
      : {
          ok: false as const,
          id: typeof (raw as { id?: unknown })?.id === "string" ? (raw as { id: string }).id : "?",
          message: r.error.issues[0]?.message ?? "Data tidak valid.",
        };
  });

  const skus = [...new Set(parsed.flatMap((p) => (p.ok ? [p.row.sku] : [])))];
  const products = await db.product.findMany({ where: { sku: { in: skus } }, include: { saleUnits: true } });
  const bySku = new Map(products.map((p) => [p.sku, p]));

  const results: SyncResult[] = [];
  for (const p of parsed) {
    if (!p.ok) {
      results.push({ id: p.id, status: "error", message: p.message });
      continue;
    }
    const product = bySku.get(p.row.sku);
    if (!product) {
      results.push({ id: p.row.id, status: "error", message: `SKU ${p.row.sku} tidak ditemukan di app.` });
      continue;
    }
    try {
      results.push(await applyRow(p.row, product));
    } catch (err) {
      if (err instanceof Prisma.PrismaClientKnownRequestError && err.code === "P2002") {
        // Dua request bersamaan mencatat ID yang sama — salah satunya sudah menang.
        results.push({ id: p.row.id, status: "duplicate" });
      } else {
        const message = err instanceof RowError ? err.message : "Gagal menyimpan ke database.";
        if (!(err instanceof RowError)) console.error("[stock-sync]", p.row.id, err);
        results.push({ id: p.row.id, status: "error", message });
      }
    }
  }
  return results;
}

/** Daftar produk (buat auto-mapping di sheet) + saldo stok sekarang (buat dicocokkan dengan hitungan sheet). */
export async function getStockSnapshot() {
  const products = await db.product.findMany({
    select: {
      sku: true,
      nama: true,
      jenisItem: true,
      stock: { select: { jumlah: true, ditahan: true } },
      saleUnits: { select: { grade: true, ukuran: true, stock: { select: { jumlah: true, ditahan: true } } } },
    },
    orderBy: { sku: "asc" },
  });

  const saldo: { sku: string; nama: string; grade: string; ukuran: string; jumlah: number; ditahan: number }[] = [];
  for (const p of products) {
    if (p.stock && (Number(p.stock.jumlah) !== 0 || Number(p.stock.ditahan) !== 0)) {
      saldo.push({ sku: p.sku, nama: p.nama, grade: "", ukuran: "", jumlah: Number(p.stock.jumlah), ditahan: Number(p.stock.ditahan) });
    }
    for (const u of p.saleUnits) {
      if (u.stock && (Number(u.stock.jumlah) !== 0 || Number(u.stock.ditahan) !== 0)) {
        saldo.push({ sku: p.sku, nama: p.nama, grade: u.grade ?? "", ukuran: u.ukuran ?? "", jumlah: Number(u.stock.jumlah), ditahan: Number(u.stock.ditahan) });
      }
    }
  }
  return { produk: products.map((p) => ({ sku: p.sku, nama: p.nama, jenis: p.jenisItem })), saldo };
}
