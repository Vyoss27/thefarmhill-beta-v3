import { Prisma } from "@prisma/client";
import { melonGradeSortIndex } from "@/lib/melon-grade";
import { stockUnitId, usesUnitStock } from "@/lib/stock-target";

const productWithRelations = Prisma.validator<Prisma.ProductDefaultArgs>()({
  include: { saleUnits: { include: { stock: true } }, stock: true, photos: { orderBy: { urutan: "asc" }, take: 1 } },
});

type ProductWithRelations = Prisma.ProductGetPayload<typeof productWithRelations>;

export type ProductGrade = { saleUnitId: string; grade: string; harga: number; satuan: string; minOrder: number };

export type CatalogProduct = {
  id: string;
  nama: string;
  jenisItem: string;
  isHabis: boolean;
  fotoUrl: string | null;
  unitCount: number;
  cheapest: { saleUnitId: string; satuan: string; harga: number; minOrder: number } | null;
  grades: ProductGrade[] | null;
  stokTersisa: number;
  /** Dipakai di homepage untuk badge peringkat "Terlaris minggu ini" (#1-#4). */
  rankBadge?: number;
  /** Caption kecil di bawah nama produk, mis. "Sisa 6 butir" di "Baru dipetik hari ini". */
  caption?: string;
  /** Sembunyikan tombol tambah cepat (mis. section "Minuman segar" — tap kartu langsung ke detail). */
  hideQuickAdd?: boolean;
  /** Melon dipecah jadi dua kartu terpisah (Perfect dan Imperfect/Sale) — ini varian yang diwakili kartu. */
  variant?: "perfect" | "imperfect";
  /** Kunci unik untuk daftar React: satu produk melon bisa muncul dua kali (Perfect + Imperfect). */
  entryKey: string;
  /** Tujuan tap kartu; default /produk/{id}. */
  href: string;
};

/**
 * Kalau produk punya >1 sale unit dengan satuan sama tapi grade beda (mis. melon
 * ons Perfect/Imperfect), tampilkan sebagai pilihan grade di kartu, bukan diarahkan
 * ke halaman detail seperti produk multi-satuan biasa.
 *
 * `variant` membatasi kartu ke satu grade — dipakai memecah melon jadi kartu Perfect dan
 * kartu Imperfect (bagian "Sale"), sesuai masukan sales: grade tidak disandingkan dalam satu item.
 */
export function toCatalogProduct(product: ProductWithRelations, variant?: "perfect" | "imperfect"): CatalogProduct {
  const sizeUnits = product.saleUnits.filter((u) => u.ukuran);
  const hasSizes = sizeUnits.length > 0;
  // Unit Perfect tanpa ukuran hanyalah KOLAM stok (tingkat harga size berbagi satu kolam) — tidak tampil
  // sebagai pilihan, tapi stoknya dihitung lewat stockUnitId di bawah.
  let units = hasSizes ? product.saleUnits.filter((u) => !(u.grade === "perfect" && !u.ukuran)) : product.saleUnits;
  if (variant) units = units.filter((u) => u.grade === variant);
  const byId = new Map(product.saleUnits.map((u) => [u.id, u]));

  const cheapestUnit = units.reduce<(typeof units)[number] | null>((min, u) => {
    if (!min || Number(u.harga) < Number(min.harga)) return u;
    return min;
  }, null);

  // Ketersediaan = jumlah semua KOLAM stok milik unit yang tampil (tiap kolam dihitung sekali).
  const kolamIds = new Set(units.filter(usesUnitStock).map((u) => stockUnitId(u)));
  const tersedia =
    kolamIds.size > 0
      ? [...kolamIds].reduce((sum, id) => {
          const s = byId.get(id)?.stock;
          return sum + Math.max(0, Number(s?.jumlah ?? 0) - Number(s?.ditahan ?? 0));
        }, 0)
      : Number(product.stock?.jumlah ?? 0) - Number(product.stock?.ditahan ?? 0);
  const isHabis = product.status === "habis" || tersedia <= 0;

  // Chip grade cuma masuk akal buat produk flat multi-grade (mis. melon ons Perfect/Imperfect
  // tanpa size) — produk per-ukuran (hasSizes) punya beberapa SaleUnit yang SEMUA share grade
  // yang sama, jadi harus dikecualikan di sini biar gak keitung "multi-grade" palsu.
  const satuanSet = new Set(units.map((u) => u.satuan));
  const gradeSet = new Set(units.map((u) => u.grade));
  const grades: ProductGrade[] | null =
    !variant && !hasSizes && units.length > 1 && satuanSet.size === 1 && units.every((u) => u.grade) && gradeSet.size === units.length
      ? units
          .slice()
          .sort((a, b) => melonGradeSortIndex(a.grade ?? "") - melonGradeSortIndex(b.grade ?? ""))
          .map((u) => ({ saleUnitId: u.id, grade: u.grade as string, harga: Number(u.harga), satuan: u.satuan, minOrder: u.minOrder }))
      : null;

  return {
    id: product.id,
    nama: product.nama,
    jenisItem: product.jenisItem,
    isHabis,
    fotoUrl: product.photos[0]?.url ?? null,
    unitCount: units.length,
    cheapest: cheapestUnit
      ? { saleUnitId: cheapestUnit.id, satuan: cheapestUnit.satuan, harga: Number(cheapestUnit.harga), minOrder: cheapestUnit.minOrder }
      : null,
    grades,
    stokTersisa: Math.max(0, tersedia),
    variant,
    entryKey: variant ? `${product.id}:${variant}` : product.id,
    href: variant === "imperfect" ? `/produk/${product.id}?grade=imperfect` : `/produk/${product.id}`,
  };
}

/** Satu produk -> satu kartu, kecuali melon yang punya Perfect DAN Imperfect: dipecah jadi dua kartu. */
export function toCatalogEntries(product: ProductWithRelations): CatalogProduct[] {
  const adaPerfect = product.saleUnits.some((u) => u.grade === "perfect");
  const adaImperfect = product.saleUnits.some((u) => u.grade === "imperfect" && !u.ukuran);
  if (adaPerfect && adaImperfect) return [toCatalogProduct(product, "perfect"), toCatalogProduct(product, "imperfect")];
  return [toCatalogProduct(product)];
}
