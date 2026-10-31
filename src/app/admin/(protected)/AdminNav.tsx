"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  ClipboardList,
  Truck,
  Sprout,
  Wallet,
  Users,
  Receipt,
  Table2,
  Settings,
  type LucideIcon,
} from "lucide-react";

type NavItem = { href: string; label: string; icon: LucideIcon; badge?: number };

const SECTIONS: { label: string; items: NavItem[] }[] = [
  {
    label: "Operasional",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
      { href: "/admin/pesanan", label: "Pesanan", icon: ClipboardList },
      { href: "/admin/pengiriman", label: "Pengiriman & Slot", icon: Truck },
      { href: "/admin/stok", label: "Stok & Panen", icon: Sprout },
    ],
  },
  {
    label: "Komersial",
    items: [
      { href: "/admin/pembayaran", label: "Pembayaran", icon: Wallet },
      { href: "/admin/pelanggan", label: "Pelanggan", icon: Users },
      { href: "/admin/voucher", label: "Diskon & Voucher", icon: Receipt },
      { href: "/admin/laporan", label: "Laporan", icon: Table2 },
    ],
  },
];

export default function AdminNav({ pendingCount }: { pendingCount: number }) {
  const pathname = usePathname();

  return (
    <aside className="hidden h-screen w-[236px] flex-none flex-col border-r border-[var(--border-default)] bg-[var(--surface-card)] md:flex">
      <div className="p-4">
        <div className="inline-flex rounded-[var(--radius-md)] bg-[var(--cream-100)] p-1.5">
          <Image src="/logo-farmhill-store.png" alt="Farmhill Store" width={88} height={22} className="h-[22px] w-auto" />
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto px-3 pb-4">
        {SECTIONS.map((section) => (
          <div key={section.label} className="mb-4">
            <p className="mb-1.5 px-2.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-subtle)]">
              {section.label}
            </p>
            <div className="flex flex-col gap-0.5">
              {section.items.map((item) => {
                const active = item.href === "/admin" ? pathname === "/admin" : pathname.startsWith(item.href);
                const badge = item.href === "/admin/pesanan" && pendingCount > 0 ? pendingCount : item.badge;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 py-2 text-sm transition-colors ${
                      active
                        ? "bg-[var(--surface-selected)] font-semibold text-[var(--text-heading)]"
                        : "text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
                    }`}
                  >
                    <item.icon size={17} strokeWidth={1.75} className={active ? "text-[var(--text-brand)]" : "text-[var(--text-muted)]"} />
                    <span className="flex-1">{item.label}</span>
                    {badge !== undefined && (
                      <span className="rounded-[var(--radius-badge)] bg-[var(--surface-accent)] px-1.5 py-0.5 text-[11px] font-semibold text-[var(--text-on-accent)]">
                        {badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>

      <div className="border-t border-[var(--border-subtle)] p-3">
        <Link
          href="/admin/pengaturan"
          className={`flex items-center gap-2.5 rounded-[var(--radius-control)] px-2.5 py-2 text-sm transition-colors ${
            pathname.startsWith("/admin/pengaturan")
              ? "bg-[var(--surface-selected)] font-semibold text-[var(--text-heading)]"
              : "text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
          }`}
        >
          <Settings size={17} strokeWidth={1.75} className="text-[var(--text-muted)]" />
          Pengaturan
        </Link>
      </div>
    </aside>
  );
}
