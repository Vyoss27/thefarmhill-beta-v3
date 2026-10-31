import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

/**
 * Ambil data Customer yang sedang login (dari akun Supabase Auth,
 * dipetakan lewat kolom `email`). Beda dari getCurrentStaff() di lib/auth.ts
 * — ini untuk pelanggan storefront, bukan admin/sales.
 */
export async function getCurrentCustomer() {
  const { customer } = await getCurrentCustomerSafe();
  return customer;
}

/**
 * Sama seperti getCurrentCustomer(), tapi juga kasih tau kalau gagalnya
 * karena Supabase error (mis. project lagi lambat/di-pause) — bukan karena
 * pelanggan memang belum login. Sebelumnya error apapun dari
 * supabase.auth.getUser() diem-diem ke-treat sama kayak "belum login",
 * jadi pelanggan yang sesinya valid bisa kelihatan ke-logout waktu
 * Supabase lagi bermasalah. Dipakai di layout.tsx buat header.
 */
export async function getCurrentCustomerSafe() {
  const supabase = await createClient();
  const {
    data: { user: authUser },
    error,
  } = await supabase.auth.getUser();

  // "Auth session missing" itu normal buat pengunjung yang belum login,
  // bukan kegagalan — cuma error LAIN (network/gateway Supabase lambat,
  // dst) yang perlu dibedakan supaya UI bisa nampilin pesan jelas.
  // Error 4xx (mis. refresh_token_not_found dari cookie sesi basi) artinya
  // sesinya memang tidak valid = belum login; cookie-nya dibersihkan
  // middleware. Hanya error jaringan / 5xx yang dianggap gagal cek.
  if (error && error.name !== "AuthSessionMissingError") {
    const status = (error as { status?: number }).status;
    if (status && status >= 400 && status < 500) {
      return { customer: null, sessionCheckFailed: false as const };
    }
    console.error("[customer-auth] Gagal cek sesi Supabase:", error);
    return { customer: null, sessionCheckFailed: true as const };
  }

  if (!authUser?.email) return { customer: null, sessionCheckFailed: false as const };

  const customer = await db.customer.findUnique({ where: { email: authUser.email } });
  return { customer, sessionCheckFailed: false as const };
}
