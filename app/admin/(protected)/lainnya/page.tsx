import Link from "next/link";
import { Sprout, Wallet, Receipt, Table2, Settings, ChevronRight } from "lucide-react";

const ITEMS = [
  { href: "/admin/stok", label: "Stok & Panen", icon: Sprout },
  { href: "/admin/pembayaran", label: "Pembayaran", icon: Wallet },
  { href: "/admin/voucher", label: "Diskon & Voucher", icon: Receipt },
  { href: "/admin/laporan", label: "Laporan", icon: Table2 },
  { href: "/admin/pengaturan", label: "Pengaturan", icon: Settings },
];

/**
 * Khusus mobile — di desktop menu-menu ini sudah ada langsung di sidebar,
 * jadi halaman ini praktis tidak pernah dibuka di layar lebar (tapi tetap
 * bisa diakses lewat URL langsung kalau perlu).
 */
export default function AdminLainnyaPage() {
  return (
    <div>
      <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-subtle)]">
        Panel admin
      </span>
      <h1 className="mt-1 font-serif text-[28px] font-semibold tracking-[-0.01em] text-[var(--text-heading)]">
        Lainnya
      </h1>

      <div className="mt-5 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)]">
        {ITEMS.map((item, idx) => (
          <Link
            key={item.href}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3.5 text-sm text-[var(--text-body)] hover:bg-[var(--surface-hover)] ${
              idx > 0 ? "border-t border-[var(--border-subtle)]" : ""
            }`}
          >
            <item.icon size={18} strokeWidth={1.75} className="text-[var(--text-muted)]" />
            <span className="flex-1 font-medium">{item.label}</span>
            <ChevronRight size={16} strokeWidth={1.75} className="text-[var(--text-subtle)]" />
          </Link>
        ))}
      </div>
    </div>
  );
}
