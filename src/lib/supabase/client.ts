import { createBrowserClient } from "@supabase/ssr";

const THIRTY_DAYS = 60 * 60 * 24 * 30;

/**
 * Supabase client untuk dipakai di Client Component (browser).
 *
 * `rememberMe: false` bikin cookie sesi jadi session-cookie (hilang begitu
 * browser ditutup) alih-alih bertahan 30 hari — dipakai di halaman login.
 * Cuma berlaku saat client ini dibuat untuk login; pemanggilan lain
 * (cek sesi, dsb) pakai default (rememberMe: true) supaya sesi yang sudah
 * ada tidak ikut kepotong durasinya.
 */
export function createClient(options?: { rememberMe?: boolean }) {
  const rememberMe = options?.rememberMe ?? true;
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookieOptions: rememberMe ? { maxAge: THIRTY_DAYS } : { maxAge: undefined },
    }
  );
}
