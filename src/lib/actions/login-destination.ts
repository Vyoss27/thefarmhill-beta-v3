"use server";

import { getCurrentStaff } from "@/lib/auth";

/**
 * Satu pintu login untuk admin/sales maupun pelanggan — dipanggil setelah
 * Supabase Auth sign-in berhasil untuk menentukan tujuan redirect.
 * Email yang terdaftar di tabel `User` (staff) diarahkan ke panel admin,
 * selain itu dianggap pelanggan.
 */
export async function getLoginDestination() {
  const staff = await getCurrentStaff();
  return staff ? "/admin" : "/";
}
