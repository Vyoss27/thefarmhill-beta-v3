/**
 * Grade melon — sebelumnya disimpan sebagai literal "A"/"B", sekarang diperjelas
 * jadi "perfect"/"imperfect" (lihat migrasi 20260921092259). "outspec" cuma
 * dipakai di StockBatch.grade (level panen) — begitu disortir buat dijual, batch
 * outspec masuk ke SaleUnit "imperfect" yang sudah ada atau langsung jadi waste,
 * jadi SaleUnit.grade sendiri tidak pernah bernilai "outspec".
 */
export const MELON_GRADES = [
  { kode: "perfect", label: "Perfect" },
  { kode: "imperfect", label: "Imperfect" },
] as const;

export type MelonGradeKode = (typeof MELON_GRADES)[number]["kode"];

/** Grade yang valid untuk StockBatch (panen masuk) — termasuk outspec. */
export const INTAKE_GRADES = [...MELON_GRADES, { kode: "outspec", label: "Outspec" }] as const;

export type IntakeGradeKode = (typeof INTAKE_GRADES)[number]["kode"];

export function melonGradeLabel(kode: string | null | undefined) {
  return INTAKE_GRADES.find((g) => g.kode === kode)?.label ?? kode ?? null;
}

/** Index urutan tampil grade (perfect dulu, bukan alfabetis) — grade tak dikenal ditaruh di akhir. */
export function melonGradeSortIndex(kode: string) {
  const idx = MELON_GRADES.findIndex((g) => g.kode === kode);
  return idx === -1 ? MELON_GRADES.length : idx;
}
