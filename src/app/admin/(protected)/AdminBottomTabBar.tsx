"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, ClipboardList, Truck, Users, MoreHorizontal } from "lucide-react";

const TABS = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { href: "/admin/pesanan", label: "Pesanan", icon: ClipboardList },
  { href: "/admin/pengiriman", label: "Kirim", icon: Truck },
  { href: "/admin/pelanggan", label: "Pelanggan", icon: Users },
  { href: "/admin/lainnya", label: "Lainnya", icon: MoreHorizontal },
] as const;

export default function AdminBottomTabBar({ pendingCount }: { pendingCount: number }) {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 grid h-16 grid-cols-5 border-t border-[var(--border-default)] bg-[var(--surface-card)] md:hidden">
      {TABS.map((tab) => {
        const isExact = "exact" in tab && tab.exact;
        const active = isExact ? pathname === tab.href : pathname.startsWith(tab.href);
        const badge = tab.href === "/admin/pesanan" && pendingCount > 0 ? pendingCount : undefined;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={`relative flex flex-col items-center justify-center gap-0.5 ${
              active ? "text-[var(--text-brand)]" : "text-[var(--text-muted)]"
            }`}
          >
            {active && <span className="absolute inset-x-3 top-0 h-[3px] rounded-b-[var(--radius-bar)] bg-[var(--surface-accent)]" />}
            <span className="relative">
              <tab.icon size={20} strokeWidth={active ? 2 : 1.75} />
              {badge !== undefined && (
                <span className="absolute -right-2 -top-1.5 flex h-[16px] min-w-[16px] items-center justify-center rounded-[var(--radius-badge)] bg-[var(--surface-accent)] px-0.5 text-[10px] font-semibold text-[var(--text-on-accent)]">
                  {badge}
                </span>
              )}
            </span>
            <span className={`text-[11px] ${active ? "font-semibold" : ""}`}>{tab.label}</span>
          </Link>
        );
      })}
    </nav>
  );
}
