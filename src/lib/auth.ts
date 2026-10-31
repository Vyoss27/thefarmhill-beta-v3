import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

/**
 * Ambil user staff (admin/sales) yang sedang login, dipetakan dari akun
 * Supabase Auth ke tabel `users` kita lewat email (kolom `kontak`).
 *
 * Tidak ada auto-provision — baris `User` harus sudah dibuat manual lebih
 * dulu (lewat Prisma Studio/seed) sebelum orang itu bisa login sebagai
 * staff. Login dengan email yang tidak terdaftar di sini dianggap pelanggan.
 */
export async function getCurrentStaff() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
  } = await supabase.auth.getUser();

  if (!authUser?.email) return null;

  const staff = await db.user.findUnique({ where: { kontak: authUser.email } });
  if (!staff?.aktif) return null;
  return staff;
}
