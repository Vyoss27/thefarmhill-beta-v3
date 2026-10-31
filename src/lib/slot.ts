/**
 * Sejak 2026-10-12 pelanggan hanya memilih TANGGAL kirim — tidak ada pilihan jam, cut-off, atau batas
 * kapasitas. Kolom `orders.jam_slot` dipertahankan: pesanan baru menyimpannya kosong, pesanan lama
 * tetap punya jamnya ("09:00-12:00" / "15:00-18:00").
 */
export const JAM_SLOT_KOSONG = "";

/** Jam kirim kalau memang ada (pesanan lama); null untuk pesanan baru. */
export function jamSlotLabel(jam: string | null | undefined) {
  return jam && /\d/.test(jam) ? jam : null;
}

/** "12 Okt 2026" atau "12 Okt 2026 · 09:00-12:00" — jam hanya ditulis kalau ada. */
export function tanggalDenganJam(tanggal: string, jam: string | null | undefined) {
  const j = jamSlotLabel(jam);
  return j ? `${tanggal} · ${j}` : tanggal;
}
