import type { Prisma } from "@prisma/client";
import { stockUnitId, usesUnitStock } from "@/lib/stock-target";

/**
 * Stok masuk -> produk berstatus "habis" otomatis jadi "aktif" kalau sudah ada stok yang
 * bisa dijual dan harganya terisi, supaya tidak perlu diaktifkan manual tiap barang datang.
 * Status "draft" (disembunyikan) tidak pernah disentuh. Kebalikannya tidak perlu: tampilan
 * toko sudah menganggap produk habis sendiri kalau stok tersedianya 0.
 */
export async function activateIfSellable(tx: Prisma.TransactionClient, productId: string) {
  const p = await tx.product.findUnique({
    where: { id: productId },
    include: { saleUnits: { include: { stock: true } }, stock: true },
  });
  if (!p || p.status !== "habis") return false;

  // Sama dengan hitungan di katalog: unit Perfect tanpa size tidak ikut dijual begitu varian size ada.
  const hasSizes = p.saleUnits.some((u) => u.ukuran);
  const visible = hasSizes ? p.saleUnits.filter((u) => !(u.grade === "perfect" && !u.ukuran)) : p.saleUnits;
  // Tingkat harga Perfect berbagi satu kolam stok — hitung tiap kolam sekali.
  const byId = new Map(p.saleUnits.map((u) => [u.id, u]));
  const kolamIds = new Set(visible.filter(usesUnitStock).map((u) => stockUnitId(u)));
  const tersedia =
    kolamIds.size > 0
      ? [...kolamIds].reduce((sum, id) => {
          const s = byId.get(id)?.stock;
          return sum + Math.max(0, Number(s?.jumlah ?? 0) - Number(s?.ditahan ?? 0));
        }, 0)
      : Number(p.stock?.jumlah ?? 0) - Number(p.stock?.ditahan ?? 0);
  const adaHarga = visible.some((u) => Number(u.harga) > 0);

  if (tersedia > 0 && adaHarga) {
    await tx.product.update({ where: { id: productId }, data: { status: "aktif" } });
    return true;
  }
  return false;
}
