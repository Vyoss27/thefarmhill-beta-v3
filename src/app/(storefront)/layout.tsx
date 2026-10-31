import Image from "next/image";
import Link from "next/link";
import { User } from "lucide-react";
import { CartProvider } from "@/lib/cart-context";
import { getCurrentCustomerSafe } from "@/lib/customer-auth";
import { getSupportWaHref } from "@/lib/support-contact";
import CartLink from "./CartLink";
import CustomerLogoutButton from "./CustomerLogoutButton";
import CustomerBottomTabBar from "./CustomerBottomTabBar";
import SplashScreen from "./SplashScreen";

export default async function StorefrontLayout({ children }: { children: React.ReactNode }) {
  const { customer, sessionCheckFailed } = await getCurrentCustomerSafe();
  const waHref = getSupportWaHref();

  return (
    <CartProvider>
      <SplashScreen />
      <div className="min-h-screen bg-[var(--surface-app)] text-[var(--text-body)]">
        <header className="sticky top-0 z-10 h-14 border-b border-[var(--border-default)] bg-[var(--surface-card)]">
          <div className="mx-auto flex h-full max-w-[1440px] items-center gap-4 px-4 sm:gap-6 sm:px-7">
            <a href="/" className="flex items-center">
              <Image src="/logo-farmhill-store.png" alt="Farmhill Store" width={150} height={30} priority className="h-[26px] w-auto sm:h-[30px]" />
            </a>
            <span className="ml-auto hidden text-[13px] text-[var(--text-muted)] sm:inline">
              Gudang Cinde Barat, Semarang
            </span>
            {sessionCheckFailed ? (
              // eslint-disable-next-line @next/next/no-html-link-for-pages -- sengaja hard reload (bukan client nav) biar server component re-cek sesi Supabase dari awal
              <a
                href="/"
                className="ml-auto flex items-center gap-1.5 text-sm text-[var(--status-danger-fg)] sm:ml-0"
                title="Gagal cek status akun — coba muat ulang"
              >
                <User size={16} strokeWidth={1.75} />
                Gagal cek akun · Muat ulang
              </a>
            ) : customer ? (
              <>
                <Link
                  href="/akun"
                  className="ml-auto flex items-center gap-1.5 text-sm text-[var(--text-body)] hover:text-[var(--text-link)] sm:ml-0"
                >
                  <User size={16} strokeWidth={1.75} />
                  Halo, {customer.nama.split(" ")[0]}
                </Link>
                <CustomerLogoutButton />
              </>
            ) : (
              <Link
                href="/login"
                className="ml-auto flex items-center gap-1.5 text-sm text-[var(--text-body)] hover:text-[var(--text-link)] sm:ml-0"
              >
                <User size={16} strokeWidth={1.75} />
                Masuk
              </Link>
            )}
            <CartLink />
          </div>
        </header>
        <main className="mx-auto max-w-[1440px] px-4 py-5 pb-24 sm:px-7 sm:py-7 md:pb-7">{children}</main>
        <CustomerBottomTabBar waHref={waHref} />
      </div>
    </CartProvider>
  );
}
