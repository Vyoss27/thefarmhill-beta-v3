/** Link WA langsung ke admin/sales — dipakai bottom nav "Chat CS", halaman Akun, dan /chat. */
export function getSupportWaHref() {
  const adminWa = process.env.ADMIN_WHATSAPP_NUMBER;
  return adminWa ? `https://wa.me/${adminWa.replace(/^0/, "62")}` : null;
}
