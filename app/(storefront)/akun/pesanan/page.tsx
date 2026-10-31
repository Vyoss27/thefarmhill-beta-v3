import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/catalog";

const STATUS_TONE: Record<string, { label: string; bg: string; fg: string }> = {
  menunggu_konfirmasi: { label: "Menunggu konfirmasi", bg: "var(--status-accent-bg)", fg: "var(--status-accent-fg)" },
  menunggu_bayar: { label: "Menunggu bayar", bg: "var(--status-accent-bg)", fg: "var(--status-accent-fg)" },
  diproses: { label: "Diproses", bg: "var(--status-info-bg)", fg: "var(--status-info-fg)" },
  dikirim: { label: "Dikirim", bg: "var(--status-info-bg)", fg: "var(--status-info-fg)" },
  selesai: { label: "Selesai", bg: "var(--status-success-bg)", fg: "var(--status-success-fg)" },
  dibatalkan: { label: "Dibatalkan", bg: "var(--status-neutral-bg)", fg: "var(--status-neutral-fg)" },
  kedaluwarsa: { label: "Kedaluwarsa", bg: "var(--status-danger-bg)", fg: "var(--status-danger-fg)" },
};

export default async function AkunPesananPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/login");

  const orders = await db.order.findMany({
    where: { customerId: customer.id },
    include: { items: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <Link href="/akun" className="inline-flex items-center gap-1.5 text-sm text-[var(--text-link)] hover:text-[var(--text-link-hover)]">
        <ArrowLeft size={16} strokeWidth={1.75} />
        Akun saya
      </Link>
      <h1 className="mt-3 font-serif text-[28px] font-semibold tracking-[-0.01em] text-[var(--text-heading)]">
        Riwayat pesanan
      </h1>
      <p className="mt-1.5 text-[15px] text-[var(--text-muted)]">Halo, {customer.nama}.</p>

      <div className="mt-5 flex flex-col gap-2.5">
        {orders.map((order) => {
          const tone = STATUS_TONE[order.status] ?? STATUS_TONE.menunggu_konfirmasi;
          return (
            <Link
              key={order.id}
              href={`/pesanan/${order.id}`}
              className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-3.5 transition-colors hover:border-[var(--border-strong)]"
            >
              <div>
                <p className="fh-numeric font-mono text-xs text-[var(--text-muted)]">{order.id.slice(0, 8).toUpperCase()}</p>
                <p className="mt-0.5 text-sm text-[var(--text-body)]">
                  {order.items.length} item · <span className="fh-numeric font-semibold text-[var(--text-heading)]">{formatRupiah(Number(order.total))}</span>
                </p>
              </div>
              <span
                className="rounded-[var(--radius-badge)] px-2.5 py-1 text-[11px] font-semibold"
                style={{ background: tone.bg, color: tone.fg }}
              >
                {tone.label}
              </span>
            </Link>
          );
        })}
        {orders.length === 0 && <p className="text-sm text-[var(--text-muted)]">Belum ada pesanan.</p>}
      </div>
    </div>
  );
}
