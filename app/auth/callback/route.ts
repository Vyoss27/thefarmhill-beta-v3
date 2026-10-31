import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/lib/db";

/**
 * Tujuan balik (redirect) login Google lewat Supabase Auth: tukar `code` jadi sesi,
 * lalu arahkan — staf ke panel admin, pelanggan yang sudah punya data ke beranda, dan
 * pelanggan baru ke /lengkapi-profil (akun Google tidak membawa nomor WhatsApp,
 * sedangkan data Customer kita wajib punya nomor WA).
 *
 * Driver sengaja tidak dilayani di sini — mereka masuk lewat email & password.
 */
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);

  // Di balik proxy Vercel, origin dari request bisa bukan domain publik.
  const forwardedHost = request.headers.get("x-forwarded-host");
  const base = process.env.NODE_ENV !== "development" && forwardedHost ? `https://${forwardedHost}` : origin;
  const gagal = () => NextResponse.redirect(`${base}/login?error=google`);

  const code = searchParams.get("code");
  if (!code) return gagal();

  const supabase = await createClient();
  const { error } = await supabase.auth.exchangeCodeForSession(code);
  if (error) {
    console.error("[auth/callback] Gagal tukar code:", error.message);
    return gagal();
  }

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return gagal();

  const staff = await db.user.findUnique({ where: { kontak: user.email } });
  if (staff?.aktif) return NextResponse.redirect(`${base}/admin`);

  const customer = await db.customer.findUnique({ where: { email: user.email } });
  return NextResponse.redirect(`${base}${customer ? "/" : "/lengkapi-profil"}`);
}
