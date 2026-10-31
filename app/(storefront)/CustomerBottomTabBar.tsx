"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, LayoutGrid, BadgePercent, Receipt, MessageCircle } from "lucide-react";

const TABS = [
  { href: "/", label: "Beranda", icon: Home },
  { href: "/katalog", label: "Kategori", icon: LayoutGrid },
  { href: "/promo", label: "Promo", icon: BadgePercent },
  { href: "/akun/pesanan", label: "Pesanan", icon: Receipt },
] as const;

export default function CustomerBottomTabBar({ waHref }: { waHref: string | null }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 grid h-16 grid-cols-5 border-t border-[var(--border-default)] bg-[var(--surface-card)] md:hidden">
      {TABS.map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative flex flex-col items-center justify-center gap-0.5 ${
              active ? "text-[var(--text-brand)]" : "text-[var(--text-muted)]"
            }`}
          >
            {active && <span className="absolute inset-x-3 top-0 h-[3px] rounded-b-[var(--radius-bar)] bg-[var(--surface-accent)]" />}
            <tab.icon size={20} strokeWidth={active ? 2 : 1.75} />
            <span className="text-[11px]">{tab.label}</span>
          </Link>
        );
      })}
      {waHref ? (
        <a
          href={waHref}
          target="_blank"
          rel="noreferrer"
          className="relative flex flex-col items-center justify-center gap-0.5 text-[var(--text-muted)]"
        >
          <MessageCircle size={20} strokeWidth={1.75} />
          <span className="text-[11px]">Chat CS</span>
        </a>
      ) : (
        <Link href="/chat" className="relative flex flex-col items-center justify-center gap-0.5 text-[var(--text-muted)]">
          <MessageCircle size={20} strokeWidth={1.75} />
          <span className="text-[11px]">Chat CS</span>
        </Link>
      )}
    </nav>
  );
}
