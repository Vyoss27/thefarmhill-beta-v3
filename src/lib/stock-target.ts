/**
 * Stok mana yang dipakai sebuah SaleUnit waktu dipesan/ditahan/dikurangi.
 *
 * - Unit melon (ber-size, Perfect, maupun Imperfect) -> `SaleUnitStock` milik unit itu
 *   (atau milik kolam stoknya, lihat stockUnitId di bawah).
 * - Selain itu -> `Stock` agregat produk (buah impor, minuman, paket, melon Outspec, dst).
 */
export function usesUnitStock(unit: { ukuran: string | null; grade: string | null }) {
  return !!unit.ukuran || unit.grade === "imperfect" || unit.grade === "perfect";
}

/**
 * Id SaleUnit yang benar-benar menyimpan stok untuk unit ini. Tingkat harga size melon Perfect
 * (Standar / +8rb / +16rb per kg) berbagi satu kolam stok — mereka menunjuk SaleUnit Perfect tanpa
 * size lewat `stokUnitId`; unit lain menyimpan stoknya sendiri.
 */
export function stockUnitId(unit: { id: string; stokUnitId: string | null }) {
  return unit.stokUnitId ?? unit.id;
}
