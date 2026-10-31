/**
 * Ukuran melon per-butir (Grade Perfect saja — Grade Imperfect tidak ada size).
 * Range berat dari tim gudang (2026-09-16). XS (0,6-0,799kg) sengaja tidak dijual
 * satuan — otomatis dialokasikan ke stok bundling/melon slice, jadi tidak masuk
 * di sini. Melon > 2,6kg otomatis Grade Imperfect, bukan JB.
 */
export const MELON_SIZES = [
  { kode: "S", label: "S", minKg: 0.8, maxKg: 0.999 },
  { kode: "M", label: "M", minKg: 1.0, maxKg: 1.499 },
  { kode: "L", label: "L", minKg: 1.5, maxKg: 1.99 },
  { kode: "XL", label: "XL", minKg: 2.0, maxKg: 2.299 },
  { kode: "JB", label: "Jumbo", minKg: 2.3, maxKg: 2.5 },
] as const;

export type MelonSizeKode = (typeof MELON_SIZES)[number]["kode"];

export function melonSizeRangeLabel(kode: string) {
  const size = MELON_SIZES.find((s) => s.kode === kode);
  if (!size) return null;
  return `${size.minKg.toLocaleString("id-ID")}–${size.maxKg.toLocaleString("id-ID")} kg`;
}

/** Rata-rata berat (kg) satu buah di size ini — dipakai estimasi kg dari mode "butir". */
export function melonSizeAvgKg(kode: string) {
  const size = MELON_SIZES.find((s) => s.kode === kode);
  if (!size) return null;
  return Math.round(((size.minKg + size.maxKg) / 2) * 1000) / 1000;
}

/** Berat minimum (kg) size ini — jadi batas bawah input mode "kg". */
export function melonSizeMinKg(kode: string) {
  return MELON_SIZES.find((s) => s.kode === kode)?.minKg ?? null;
}
