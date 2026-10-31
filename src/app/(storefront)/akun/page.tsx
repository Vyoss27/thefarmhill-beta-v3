import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, Bell, Lightbulb, Receipt, FileText, HelpCircle, Headphones, Lock } from "lucide-react";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { getSupportWaHref } from "@/lib/support-contact";
import AkunForm from "./AkunForm";
import CustomerLogoutButton from "../CustomerLogoutButton";

const MENU_ITEMS = [
  { href: "/akun/diingatkan", label: "Produk yang Diingatkan", icon: Bell },
  { href: "/akun/sarankan-produk", label: "Sarankan Produk", icon: Lightbulb },
  { href: "/akun/pesanan", label: "Riwayat Pesanan", icon: Receipt },
  { href: "/syarat-ketentuan", label: "Syarat & Ketentuan", icon: FileText },
] as const;

const BANTUAN_ITEMS = [
  { href: "/faq", label: "FAQ", icon: HelpCircle },
  { href: "/kebijakan-privasi", label: "Kebijakan Privasi", icon: Lock },
] as const;

function MenuRow({ href, label, icon: Icon, external }: { href: string; label: string; icon: typeof Bell; external?: boolean }) {
  return (
    <Link
      href={href}
      target={external ? "_blank" : undefined}
      rel={external ? "noreferrer" : undefined}
      className="flex items-center gap-3 border-b border-[var(--border-subtle)] px-4 py-3.5 text-sm font-medium text-[var(--text-body)] last:border-0 hover:bg-[var(--surface-hover)]"
    >
      <Icon size={18} strokeWidth={1.75} className="flex-none text-[var(--text-muted)]" />
      <span className="flex-1">{label}</span>
      <ChevronRight size={18} strokeWidth={1.75} className="flex-none text-[var(--text-muted)]" />
    </Link>
  );
}

export default async function AkunPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/login");
  const waHref = getSupportWaHref();

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-serif text-[28px] font-semibold tracking-[-0.01em] text-[var(--text-heading)]">Akun saya</h1>
      <p className="mt-1.5 text-[15px] text-[var(--text-muted)]">{customer.email}</p>

      <h2 className="mt-6 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-subtle)]">Detail Akun</h2>
      <AkunForm customer={{ id: customer.id, nama: customer.nama, wa: customer.wa, alamat: customer.alamat ?? "" }} />

      <div className="mt-5 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)]">
        {MENU_ITEMS.map((item) => (
          <MenuRow key={item.href} {...item} />
        ))}
      </div>

      <h2 className="mt-6 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-subtle)]">Bantuan</h2>
      <div className="mt-2.5 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)]">
        <MenuRow href={BANTUAN_ITEMS[0].href} label={BANTUAN_ITEMS[0].label} icon={BANTUAN_ITEMS[0].icon} />
        {waHref ? (
          <MenuRow href={waHref} label="Chat CS" icon={Headphones} external />
        ) : (
          <MenuRow href="/chat" label="Chat CS" icon={Headphones} />
        )}
        <MenuRow href={BANTUAN_ITEMS[1].href} label={BANTUAN_ITEMS[1].label} icon={BANTUAN_ITEMS[1].icon} />
      </div>

      <div className="mt-6 flex justify-center">
        <CustomerLogoutButton />
      </div>
    </div>
  );
}
