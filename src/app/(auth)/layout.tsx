/**
 * Halaman auth (login/daftar/lupa-password/reset-password) sengaja tanpa
 * header/nav storefront — tiap halaman mengatur presentasinya sendiri
 * (kartu mobile, split-panel desktop) mengikuti desain login.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-[var(--surface-app)]">{children}</div>;
}
