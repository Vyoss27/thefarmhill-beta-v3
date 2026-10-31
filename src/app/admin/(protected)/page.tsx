import Link from "next/link";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/catalog";

const STATUS_BADGE: Record<string, { label: string; bg: string; fg: string }> = {
  menunggu_konfirmasi: { label: "Menunggu konfirmasi", bg: "var(--status-accent-bg)", fg: "var(--status-accent-fg)" },
  menunggu_bayar: { label: "Menunggu bayar", bg: "var(--status-accent-bg)", fg: "var(--status-accent-fg)" },
  diproses: { label: "Diproses", bg: "var(--status-info-bg)", fg: "var(--status-info-fg)" },
  dikirim: { label: "Dikirim", bg: "var(--status-info-bg)", fg: "var(--status-info-fg)" },
  selesai: { label: "Selesai", bg: "var(--status-success-bg)", fg: "var(--status-success-fg)" },
  dibatalkan: { label: "Dibatalkan", bg: "var(--status-neutral-bg)", fg: "var(--status-neutral-fg)" },
  kedaluwarsa: { label: "Kedaluwarsa", bg: "var(--status-danger-bg)", fg: "var(--status-danger-fg)" },
};

function jakartaDayRange(daysAgo: number) {
  const now = new Date();
  const jakartaStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  const base = new Date(`${jakartaStr}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() - daysAgo);
  const start = new Date(base);
  const end = new Date(base);
  end.setUTCDate(end.getUTCDate() + 1);
  return { start, end, label: base };
}

export default async function AdminDashboardPage() {
  const today = jakartaDayRange(0);
  const yesterday = jakartaDayRange(1);

  const [menungguKonfirmasi, produk, pesananHariIni, pesananKemarin, recentOrders] = await Promise.all([
    db.order.count({ where: { status: "menunggu_konfirmasi" } }),
    db.product.findMany({ include: { stock: true } }),
    db.order.findMany({
      where: { createdAt: { gte: today.start, lt: today.end } },
      select: { total: true, status: true, jamSlot: true },
    }),
    db.order.findMany({
      where: { createdAt: { gte: yesterday.start, lt: yesterday.end } },
      select: { total: true, status: true },
    }),
    db.order.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { customer: true, items: true },
    }),
  ]);

  const validToday = pesananHariIni.filter((o) => o.status !== "dibatalkan" && o.status !== "kedaluwarsa");
  const penjualanHariIni = validToday.reduce((sum, o) => sum + Number(o.total), 0);
  const penjualanKemarin = pesananKemarin
    .filter((o) => o.status !== "dibatalkan" && o.status !== "kedaluwarsa")
    .reduce((sum, o) => sum + Number(o.total), 0);
  const delta = penjualanKemarin > 0 ? ((penjualanHariIni - penjualanKemarin) / penjualanKemarin) * 100 : null;

  const stokKritis = produk.filter((p) => {
    const jumlah = Number(p.stock?.jumlah ?? 0);
    const ambang = p.ambangStokTipis ? Number(p.ambangStokTipis) : null;
    return ambang !== null && jumlah <= ambang && p.status !== "draft";
  });

  // 7 hari terakhir untuk grafik penjualan harian
  const chartDays = await Promise.all(
    Array.from({ length: 7 }, (_, i) => 6 - i).map(async (daysAgo) => {
      const range = jakartaDayRange(daysAgo);
      const orders = await db.order.findMany({
        where: { createdAt: { gte: range.start, lt: range.end }, status: { notIn: ["dibatalkan", "kedaluwarsa"] } },
        select: { total: true },
      });
      const total = orders.reduce((sum, o) => sum + Number(o.total), 0);
      return { label: range.label.toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" }), total };
    })
  );
  const maxChart = Math.max(1, ...chartDays.map((d) => d.total));

  return (
    <div className="flex flex-col gap-5">
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-subtle)]">
          Panel admin
        </span>
        <h1 className="mt-1 font-serif text-[28px] font-semibold tracking-[-0.01em] text-[var(--text-heading)]">
          Dashboard
        </h1>
      </div>

      {menungguKonfirmasi > 0 && (
        <Link
          href="/admin/pesanan"
          className="flex flex-col gap-1 rounded-[var(--radius-card)] border border-[var(--status-accent-border)] bg-[var(--status-accent-bg)] p-4 hover:brightness-[0.98]"
        >
          <p className="text-[15px] font-semibold text-[var(--status-accent-fg)]">
            {menungguKonfirmasi} pesanan menunggu konfirmasi
          </p>
          <p className="text-sm text-[var(--status-accent-fg)]">
            Konfirmasi supaya tagihan bisa dikirim ke pelanggan.
          </p>
        </Link>
      )}

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Menunggu konfirmasi" value={String(menungguKonfirmasi)} />
        <StatCard label="Pesanan masuk hari ini" value={String(pesananHariIni.length)} />
        <StatCard
          label="Penjualan hari ini"
          value={formatRupiah(penjualanHariIni)}
          delta={delta !== null ? `${delta >= 0 ? "+" : ""}${delta.toFixed(1)}%` : undefined}
          deltaGood={delta !== null ? delta >= 0 : undefined}
          caption="vs kemarin"
        />
        <StatCard
          label="Kirim hari ini"
          value={String(validToday.length)}
          unit="pesanan"
          caption="dipesan hari ini"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-heading)]">Penjualan harian</h2>
          <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">7 hari terakhir · Rp</p>
          <div className="mt-5 flex h-[150px] items-end gap-3">
            {chartDays.map((d) => (
              <div key={d.label} className="flex flex-1 flex-col items-center gap-2">
                <div
                  className="w-full rounded-t-[var(--radius-bar)] bg-[var(--chart-1)]"
                  style={{ height: `${Math.max(4, (d.total / maxChart) * 130)}px` }}
                  title={formatRupiah(d.total)}
                />
                <span className="text-[11px] text-[var(--text-muted)]">{d.label}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-heading)]">Stok</h2>
          <div className="mt-4 flex flex-col gap-4">
            <div>
              <p className="text-[13px] text-[var(--text-muted)]">
                {stokKritis.length === 0 ? "Tidak ada produk di bawah ambang stok tipis." : `${stokKritis.length} produk di bawah ambang stok kritis.`}
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)]">
        <h2 className="px-5 pt-5 text-sm font-semibold text-[var(--text-heading)]">Pesanan terbaru</h2>
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--surface-sunken)] text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                <th className="px-5 py-2.5 font-semibold">Pesanan</th>
                <th className="px-3 py-2.5 font-semibold">Pelanggan</th>
                <th className="px-3 py-2.5 font-semibold">Item</th>
                <th className="px-3 py-2.5 font-semibold">Slot kirim</th>
                <th className="px-3 py-2.5 text-right font-semibold">Total</th>
                <th className="px-5 py-2.5 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order, idx) => {
                const badge = STATUS_BADGE[order.status] ?? STATUS_BADGE.menunggu_konfirmasi;
                return (
                  <tr
                    key={order.id}
                    className={`border-b border-[var(--border-subtle)] last:border-0 ${idx % 2 === 1 ? "bg-[var(--surface-sunken)]/40" : ""}`}
                  >
                    <td className="fh-numeric px-5 py-2.5 font-mono text-[13px] text-[var(--text-body)]">
                      <Link href={`/admin/pesanan/${order.id}`} className="hover:text-[var(--text-link)]">
                        {order.id.slice(0, 8).toUpperCase()}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-[var(--text-body)]">{order.customer.nama}</td>
                    <td className="px-3 py-2.5 text-[var(--text-body)]">{order.items.length} item</td>
                    <td className="fh-numeric px-3 py-2.5 text-[var(--text-body)]">
                      {order.tanggalSlot.toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" })} · {order.jamSlot}
                    </td>
                    <td className="fh-numeric px-3 py-2.5 text-right font-semibold text-[var(--text-heading)]">
                      {formatRupiah(Number(order.total))}
                    </td>
                    <td className="px-5 py-2.5">
                      <span
                        className="rounded-[var(--radius-badge)] px-2 py-1 text-[11px] font-semibold"
                        style={{ background: badge.bg, color: badge.fg }}
                      >
                        {badge.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
              {recentOrders.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-6 text-center text-[var(--text-muted)]">
                    Belum ada pesanan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="px-5 pb-4 pt-3">
          <Link href="/admin/pesanan" className="text-[13px] font-medium text-[var(--text-link)] hover:text-[var(--text-link-hover)]">
            Lihat semua pesanan →
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  unit,
  caption,
  delta,
  deltaGood,
}: {
  label: string;
  value: string;
  unit?: string;
  caption?: string;
  delta?: string;
  deltaGood?: boolean;
}) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] p-4">
      <p className="text-[13px] text-[var(--text-muted)]">{label}</p>
      <p className="fh-numeric mt-1.5 text-[26px] font-semibold leading-none text-[var(--text-heading)]">
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-[var(--text-muted)]">{unit}</span>}
      </p>
      {(delta || caption) && (
        <p className="mt-1.5 text-[13px]">
          {delta && (
            <span className={`fh-numeric font-semibold ${deltaGood ? "text-[var(--success-500)]" : "text-[var(--status-danger-fg)]"}`}>
              {delta}{" "}
            </span>
          )}
          <span className="text-[var(--text-muted)]">{caption}</span>
        </p>
      )}
    </div>
  );
}
