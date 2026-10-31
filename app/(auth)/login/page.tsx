"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Eye, EyeOff, Lock, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { getLoginDestination } from "@/lib/actions/login-destination";

// Tombol Google baru ditampilkan setelah provider-nya diaktifkan di Supabase
// (set NEXT_PUBLIC_GOOGLE_LOGIN=true di env) — kalau belum, tombolnya cuma mengarah ke error.
const GOOGLE_ENABLED = process.env.NEXT_PUBLIC_GOOGLE_LOGIN === "true";

const fieldClass =
  "h-12 w-full rounded-xl border border-transparent bg-[var(--surface-sunken)] pl-11 pr-3.5 text-[15px] text-[var(--text-body)] outline-none transition-[border-color,box-shadow,background-color] placeholder:text-[var(--text-subtle)] focus:border-[var(--border-focus)] focus:bg-[var(--surface-card)] focus:shadow-[var(--shadow-focus)]";

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);

  // Callback Google yang gagal mengarahkan balik ke /login?error=google.
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("error") === "google") {
      setError("Masuk dengan Google gagal. Coba lagi, atau masuk dengan email.");
    }
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient({ rememberMe });
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

    if (signInError) {
      setLoading(false);
      setError(
        signInError.message.includes("Email not confirmed")
          ? "Email belum dikonfirmasi — cek link yang dikirim saat daftar."
          : "Email atau password salah."
      );
      return;
    }

    const destination = await getLoginDestination();
    // Navigasi penuh (bukan router.push) — memastikan cookie sesi yang baru
    // saja disetel ikut terbawa bersih di request pertama ke server,
    // menghindari race RSC yang sempat bikin halaman /admin gagal load
    // sampai di-reload manual.
    window.location.href = destination;
  }

  async function handleGoogle() {
    setError(null);
    setGoogleLoading(true);
    const supabase = createClient({ rememberMe });
    const { error: oauthError } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
    if (oauthError) {
      setGoogleLoading(false);
      setError("Masuk dengan Google belum bisa dipakai. Coba masuk dengan email.");
    }
  }

  return (
    <div className="min-h-screen md:grid md:grid-cols-[minmax(0,1fr)_480px]">
      {/* Panel kiri — desktop saja */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-[var(--leaf-700)] p-12 md:flex">
        <div className="relative w-fit rounded-[var(--radius-md)] bg-[var(--cream-100)] px-4 py-3.5">
          <Image src="/logo-farmhill-store.png" alt="Farmhill Store" width={176} height={44} className="h-11 w-auto" />
        </div>
        <Image
          src="/produk/sunray-melon.jpg"
          alt=""
          width={320}
          height={320}
          className="absolute -right-10 top-1/2 h-[320px] w-[320px] -translate-y-1/2 rounded-full border-[6px] border-white/20 object-cover opacity-90"
        />
        <div className="relative max-w-[22ch]">
          <p className="font-serif text-3xl leading-[1.25] tracking-[-0.01em] text-[var(--cream-50)]">
            Buah segar dari kebun sendiri, dikirim hari ini.
          </p>
          <p className="mt-3.5 text-sm text-[var(--leaf-100)]">Gudang Cinde Barat, Semarang</p>
        </div>
      </div>

      <div className="flex min-h-screen flex-col md:min-h-0 md:justify-center md:border-l md:border-[var(--border-default)] md:bg-[var(--surface-card)] md:px-11 md:py-12">
        {/* Hero — mobile saja */}
        <div className="relative overflow-hidden rounded-b-[32px] bg-gradient-to-br from-[var(--leaf-700)] to-[var(--leaf-600)] px-6 pb-9 pt-8 md:hidden">
          <div className="w-fit rounded-[var(--radius-md)] bg-[var(--cream-100)] px-3.5 py-2.5">
            <Image src="/logo-farmhill-store.png" alt="Farmhill Store" width={174} height={58} priority className="h-[36px] w-auto" />
          </div>
          <p className="mt-5 max-w-[17ch] font-serif text-[22px] leading-[1.25] tracking-[-0.01em] text-[var(--cream-50)]">
            Buah segar dari kebun sendiri, dikirim hari ini.
          </p>
          <Image
            src="/produk/sunray-melon.jpg"
            alt=""
            width={140}
            height={140}
            priority
            className="absolute -bottom-6 -right-4 h-[132px] w-[132px] rounded-full border-4 border-white/25 object-cover"
          />
        </div>

        <div className="flex flex-1 flex-col px-6 pb-6 pt-7 md:flex-none md:p-0">
          <h1 className="font-serif text-[28px] font-semibold leading-[1.15] tracking-[-0.01em] text-[var(--text-heading)]">
            Selamat datang kembali
          </h1>
          <p className="mt-1.5 text-[15px] leading-snug text-[var(--text-muted)]">Masuk untuk pesan buah dari gudang Cinde Barat, Semarang.</p>

          <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-3.5">
            <div className="relative">
              <Mail size={18} strokeWidth={1.75} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" />
              <input
                id="email"
                type="email"
                required
                autoComplete="email"
                placeholder="Email"
                aria-label="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={fieldClass}
              />
            </div>
            <div className="relative">
              <Lock size={18} strokeWidth={1.75} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" />
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                required
                autoComplete="current-password"
                placeholder="Password"
                aria-label="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={`${fieldClass} pr-11`}
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                aria-label={showPassword ? "Sembunyikan password" : "Tampilkan password"}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)] hover:text-[var(--text-body)]"
              >
                {showPassword ? <EyeOff size={18} strokeWidth={1.75} /> : <Eye size={18} strokeWidth={1.75} />}
              </button>
            </div>

            <div className="flex items-center justify-between gap-3">
              <label className="flex items-center gap-2 text-sm text-[var(--text-body)]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="h-4 w-4 rounded-[var(--radius-xs)] border-[var(--border-default)] accent-[var(--leaf-600)]"
                />
                Tetap masuk
              </label>
              <Link href="/lupa-password" className="whitespace-nowrap text-sm font-semibold text-[var(--text-link)] hover:text-[var(--text-link-hover)]">
                Lupa password?
              </Link>
            </div>

            {error && (
              <p className="rounded-[var(--radius-control)] bg-[var(--status-danger-bg)] px-3 py-2 text-sm text-[var(--status-danger-fg)]">{error}</p>
            )}

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="h-12 rounded-xl bg-[var(--action-primary-bg)] text-[15px] font-semibold text-[var(--text-on-brand)] transition-colors hover:bg-[var(--action-primary-bg-hover)] active:bg-[var(--action-primary-bg-active)] disabled:opacity-60"
            >
              {loading ? "Masuk…" : "Masuk"}
            </button>
          </form>

          {GOOGLE_ENABLED && (
            <>
              <div className="my-5 flex items-center gap-3 text-[12.5px] text-[var(--text-subtle)]">
                <span className="h-px flex-1 bg-[var(--border-default)]" />
                atau lanjutkan dengan
                <span className="h-px flex-1 bg-[var(--border-default)]" />
              </div>
              <button
                type="button"
                onClick={handleGoogle}
                disabled={loading || googleLoading}
                className="flex h-12 w-full items-center justify-center gap-2.5 rounded-xl border border-[var(--border-default)] bg-[var(--surface-card)] text-[15px] font-semibold text-[var(--text-body)] transition-colors hover:border-[var(--border-strong)] disabled:opacity-60"
              >
                <GoogleLogo />
                {googleLoading ? "Mengalihkan…" : "Google"}
              </button>
            </>
          )}

          <p className="mt-6 text-center text-sm text-[var(--text-muted)]">
            Belum punya akun?{" "}
            <Link href="/daftar" className="font-semibold text-[var(--text-link)] hover:text-[var(--text-link-hover)]">
              Daftar
            </Link>
          </p>

          <div className="mt-auto flex items-center justify-center gap-2 pt-6 md:hidden">
            <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-subtle)]">PT Kebun Bumi Lestari</span>
          </div>
        </div>
      </div>
    </div>
  );
}
