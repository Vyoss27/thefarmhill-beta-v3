import Link from "next/link";
import { db } from "@/lib/db";
import { CATEGORY_LABEL, formatRupiah } from "@/lib/catalog";
import LaporanExportButton from "./LaporanExportButton";

const PERIODS = [
  { id: "7", label: "7 hari" },
  { id: "30", label: "30 hari" },
  { id: "all", label: "Semua" },
] as const;

function jakartaDayRange(daysAgo: number) {
  const now = new Date();
  const jakartaStr = now.toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  const base = new Date(`${jakartaStr}T00:00:00Z`);
  base.setUTCDate(base.getUTCDate() - daysAgo);
  return base;
}

export default async function AdminLaporanPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const { period: periodParam } = await searchParams;
  const period = PERIODS.some((p) => p.id === periodParam) ? periodParam! : "7";

  const periodStart = period === "all" ? null : jakartaDayRange(Number(period) - 1);

  const orders = await db.order.findMany({
    where: periodStart ? { createdAt: { gte: periodStart } } : undefined,
    include: { items: { include: { saleUnit: { include: { product: true } } } } },
  });

  const validOrders = orders.filter((o) => o.status !== "dibatalkan" && o.status !== "kedaluwarsa");
  const gagalBayar = orders.filter((o) => o.status === "kedaluwarsa").length;

  const omzet = validOrders.reduce((sum, o) => sum + Number(o.total), 0);
  const rataRata = validOrders.length > 0 ? omzet / validOrders.length : 0;

  const produkTerjual: Record<string, { nama: string; jenis: string; sat: string; qty: number; nilai: number }> = {};
  const kategoriNilai: Record<string, number> = {};
  for (const o of validOrders) {
    for (const item of o.items) {
      const key = item.saleUnit.id;
      // Item per-ukuran (melon): harga final baru pasti dari berat aktual hasil
      // timbangan, bukan qty (estimasi/permintaan saat checkout) — kalau belum
      // ditimbang, belum ada nilai penjualan yang real untuk dihitung.
      const perluTimbang = !!item.saleUnit.ukuran;
      const jumlahTerjual = perluTimbang ? Number(item.beratAktual ?? 0) : Number(item.qty);
      const nilai = Number(item.hargaSaatPesan) * jumlahTerjual;
      if (!produkTerjual[key]) {
        produkTerjual[key] = {
          nama: item.saleUnit.product.nama,
          jenis: CATEGORY_LABEL[item.saleUnit.product.jenisItem] ?? item.saleUnit.product.jenisItem,
          sat: perluTimbang ? "kg" : item.saleUnit.satuan,
          qty: 0,
          nilai: 0,
        };
      }
      produkTerjual[key].qty += jumlahTerjual;
      produkTerjual[key].nilai += nilai;
      kategoriNilai[item.saleUnit.product.jenisItem] = (kategoriNilai[item.saleUnit.product.jenisItem] ?? 0) + nilai;
    }
  }
  const terlaris = Object.values(produkTerjual).sort((a, b) => b.qty - a.qty).slice(0, 8);
  const totalQty = terlaris.reduce((s, p) => s + p.qty, 0);
  const totalNilaiTable = terlaris.reduce((s, p) => s + p.nilai, 0);

  const kategoriRows = Object.entries(kategoriNilai)
    .map(([key, nilai]) => ({ key, label: CATEGORY_LABEL[key] ?? key, nilai }))
    .sort((a, b) => b.nilai - a.nilai);
  const maxKategori = Math.max(1, ...kategoriRows.map((k) => k.nilai));

  const chartDaysCount = period === "all" ? null : Math.min(Number(period), 14);
  const chartDays = chartDaysCount
    ? await Promise.all(
        Array.from({ length: chartDaysCount }, (_, i) => chartDaysCount - 1 - i).map(async (daysAgo) => {
          const dayStart = jakartaDayRange(daysAgo);
          const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
          const dayOrders = await db.order.findMany({
            where: { createdAt: { gte: dayStart, lt: dayEnd }, status: { notIn: ["dibatalkan", "kedaluwarsa"] } },
            select: { total: true },
          });
          return {
            label: dayStart.toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" }),
            total: dayOrders.reduce((s, o) => s + Number(o.total), 0),
          };
        })
      )
    : null;
  const maxChart = chartDays ? Math.max(1, ...chartDays.map((d) => d.total)) : 1;

  const periodLabel =
    period === "all"
      ? "Sepanjang waktu"
      : `${jakartaDayRange(Number(period) - 1).toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" })} – ${jakartaDayRange(0).toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" })} 2026`;

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-subtle)]">
            Panel admin
          </span>
          <h1 className="mt-1 font-serif text-[28px] font-semibold tracking-[-0.01em] text-[var(--text-heading)]">
            Laporan penjualan
          </h1>
          <p className="mt-1 text-[13px] text-[var(--text-muted)]">Periode {periodLabel}</p>
        </div>
        <div className="flex gap-2">
          {PERIODS.map((p) => (
            <Link
              key={p.id}
              href={`/admin/laporan?period=${p.id}`}
              className={`rounded-[var(--radius-control)] px-3 py-2 text-[13px] font-medium transition-colors ${
                period === p.id
                  ? "bg-[var(--surface-brand)] font-semibold text-[var(--text-on-brand)]"
                  : "border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-body)] hover:border-[var(--border-strong)]"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Total omzet" value={formatRupiah(omzet)} caption="pesanan valid, periode ini" />
        <StatCard label="Jumlah pesanan valid" value={String(validOrders.length)} unit="pesanan" />
        <StatCard label="Rata-rata nilai pesanan" value={formatRupiah(Math.round(rataRata))} />
        <StatCard label="Kedaluwarsa (gagal bayar)" value={String(gagalBayar)} caption="lewat batas bayar 1 hari" />
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-heading)]">Penjualan harian</h2>
          <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">
            {chartDays ? `${chartDays.length} hari terakhir · Rp` : "Pilih periode 7 atau 30 hari untuk lihat grafik"}
          </p>
          {chartDays && (
            <div className="mt-5 flex h-[160px] items-end gap-1.5">
              {chartDays.map((d) => (
                <div key={d.label} className="flex flex-1 flex-col items-center gap-1.5">
                  <div
                    className="w-full rounded-t-[var(--radius-bar)] bg-[var(--chart-1)]"
                    style={{ height: `${Math.max(4, (d.total / maxChart) * 140)}px` }}
                    title={`${d.label}: ${formatRupiah(d.total)}`}
                  />
                  {chartDays.length <= 7 && <span className="text-[10px] text-[var(--text-muted)]">{d.label}</span>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-heading)]">Penjualan per kategori</h2>
          <div className="mt-4 flex flex-col gap-3.5">
            {kategoriRows.length === 0 && <p className="text-sm text-[var(--text-muted)]">Belum ada penjualan.</p>}
            {kategoriRows.map((k) => (
              <div key={k.key}>
                <div className="mb-1.5 flex justify-between text-sm text-[var(--text-body)]">
                  <span>{k.label}</span>
                  <span className="fh-numeric font-semibold">{formatRupiah(k.nilai)}</span>
                </div>
                <div className="h-2 overflow-hidden rounded-[var(--radius-bar)] bg-[var(--surface-sunken)]">
                  <div
                    className="h-full rounded-[var(--radius-bar)] bg-[var(--chart-1)]"
                    style={{ width: `${(k.nilai / maxKategori) * 100}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] p-5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-[var(--text-heading)]">Produk terlaris</h2>
            <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">Diurutkan dari jumlah terjual</p>
          </div>
          <LaporanExportButton rows={terlaris.map((p) => ({ produk: p.nama, jenis: p.jenis, sat: p.sat, qty: p.qty, nilai: p.nilai }))} />
        </div>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)] text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                <th className="py-2 pr-3 font-semibold">Produk</th>
                <th className="px-3 py-2 font-semibold">Jenis item</th>
                <th className="px-3 py-2 font-semibold">Sat</th>
                <th className="px-3 py-2 text-right font-semibold">Terjual</th>
                <th className="pl-3 py-2 text-right font-semibold">Nilai (Rp)</th>
              </tr>
            </thead>
            <tbody>
              {terlaris.map((p, i) => (
                <tr key={p.nama} className={`border-b border-[var(--border-subtle)] ${i % 2 === 1 ? "bg-[var(--surface-sunken)]/40" : ""}`}>
                  <td className="py-2 pr-3 text-[var(--text-body)]">{p.nama}</td>
                  <td className="px-3 py-2 text-[var(--text-body)]">{p.jenis}</td>
                  <td className="px-3 py-2 text-[var(--text-body)]">{p.sat}</td>
                  <td className="fh-numeric px-3 py-2 text-right text-[var(--text-body)]">{p.qty}</td>
                  <td className="fh-numeric pl-3 py-2 text-right font-semibold text-[var(--text-heading)]">{formatRupiah(p.nilai)}</td>
                </tr>
              ))}
              {terlaris.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-[var(--text-muted)]">
                    Belum ada penjualan pada periode ini.
                  </td>
                </tr>
              )}
            </tbody>
            {terlaris.length > 0 && (
              <tfoot>
                <tr className="border-t-2 border-[var(--border-default)] font-semibold text-[var(--text-heading)]">
                  <td className="py-2 pr-3">Total</td>
                  <td className="px-3 py-2" />
                  <td className="px-3 py-2" />
                  <td className="fh-numeric px-3 py-2 text-right">{totalQty}</td>
                  <td className="fh-numeric pl-3 py-2 text-right">{formatRupiah(totalNilaiTable)}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      </div>
    </div>
  );
}

function StatCard({ label, value, unit, caption }: { label: string; value: string; unit?: string; caption?: string }) {
  return (
    <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] p-4">
      <p className="text-[13px] text-[var(--text-muted)]">{label}</p>
      <p className="fh-numeric mt-1.5 text-[26px] font-semibold leading-none text-[var(--text-heading)]">
        {value}
        {unit && <span className="ml-1 text-sm font-normal text-[var(--text-muted)]">{unit}</span>}
      </p>
      {caption && <p className="mt-1.5 text-[13px] text-[var(--text-muted)]">{caption}</p>}
    </div>
  );
}
