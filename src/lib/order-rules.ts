/**
 * Pesanan "menunggu konfirmasi" yang tidak ditangani tim lebih lama dari ini otomatis dibatalkan.
 * Dijalankan cron harian (plan Vercel Hobby cuma boleh sekali sehari), jadi pembatalan nyata bisa
 * tertunda sampai ~48 jam setelah pesanan dibuat. Ini jaring pengaman — konfirmasi manual
 * (cek ketersediaan size ke customer lewat WhatsApp) tetap jalur utama.
 */
export const BATAS_KONFIRMASI_JAM = 24;

/** Lewat jam ini pesanan "menunggu konfirmasi" diberi penanda di daftar admin dan masuk ringkasan pengingat WhatsApp. */
export const PENGINGAT_KONFIRMASI_JAM = 6;
