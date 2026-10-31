"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Search, Download, MessageCircle } from "lucide-react";
import { PENGINGAT_KONFIRMASI_JAM } from "@/lib/order-rules";

export type OrderRow = {
  id: string;
  customerNama: string;
  customerWa: string;
  itemCount: number;
  slotLabel: string;
  totalLabel: string;
  totalRaw: number;
  status: string;
  createdAtIso: string;
};

const STATUS_LABEL: Record<string, string> = {
  menunggu_konfirmasi: "Menunggu konfirmasi",
  menunggu_bayar: "Menunggu bayar",
  diproses: "Diproses",
  dikirim: "Dikirim",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
  kedaluwarsa: "Kedaluwarsa",
};

const STATUS_TONE: Record<string, { bg: string; fg: string }> = {
  menunggu_konfirmasi: { bg: "var(--status-accent-bg)", fg: "var(--status-accent-fg)" },
  menunggu_bayar: { bg: "var(--status-accent-bg)", fg: "var(--status-accent-fg)" },
  diproses: { bg: "var(--status-info-bg)", fg: "var(--status-info-fg)" },
  dikirim: { bg: "var(--status-info-bg)", fg: "var(--status-info-fg)" },
  selesai: { bg: "var(--status-success-bg)", fg: "var(--status-success-fg)" },
  dibatalkan: { bg: "var(--status-neutral-bg)", fg: "var(--status-neutral-fg)" },
  kedaluwarsa: { bg: "var(--status-danger-bg)", fg: "var(--status-danger-fg)" },
};

const TABS = [
  { id: "tindakan", label: "Perlu tindakan", statuses: ["menunggu_konfirmasi", "menunggu_bayar"] },
  { id: "diproses", label: "Diproses", statuses: ["diproses"] },
  { id: "dikirim", label: "Dikirim", statuses: ["dikirim"] },
  { id: "selesai", label: "Selesai", statuses: ["selesai", "dibatalkan", "kedaluwarsa"] },
] as const;

export default function AdminPesananTable({ orders }: { orders: OrderRow[] }) {
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("tindakan");
  const [query, setQuery] = useState("");

  const activeTab = TABS.find((t) => t.id === tab)!;

  const filtered = useMemo(() => {
    const byTab = orders.filter((o) => activeTab.statuses.includes(o.status as never));
    if (!query.trim()) return byTab;
    const q = query.trim().toLowerCase();
    return byTab.filter((o) => o.id.toLowerCase().includes(q) || o.customerNama.toLowerCase().includes(q));
  }, [orders, activeTab, query]);

  function exportCsv() {
    const header = ["Pesanan", "Pelanggan", "Item", "Slot kirim", "Total", "Status"];
    const rows = filtered.map((o) => [
      o.id.slice(0, 8).toUpperCase(),
      o.customerNama,
      `${o.itemCount} item`,
      o.slotLabel,
      o.totalRaw,
      STATUS_LABEL[o.status] ?? o.status,
    ]);
    const csv = [header, ...rows]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `pesanan-${activeTab.id}-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2">
        {TABS.map((t) => {
          const count = orders.filter((o) => t.statuses.includes(o.status as never)).length;
          return (
            <button
              key={t.id}
              type="button"
              onClick={() => setTab(t.id)}
              className={`rounded-[var(--radius-control)] px-3 py-2 text-[13px] font-medium transition-colors ${
                tab === t.id
                  ? "bg-[var(--surface-brand)] font-semibold text-[var(--text-on-brand)]"
                  : "border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-body)] hover:border-[var(--border-strong)]"
              }`}
            >
              {t.label}
              {count > 0 && <span className="ml-1.5 opacity-80">{count}</span>}
            </button>
          );
        })}

        <div className="ml-auto flex items-center gap-2.5">
          <div className="relative">
            <Search size={15} strokeWidth={2} className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Cari no. pesanan / pelanggan"
              className="h-[34px] w-60 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-card)] pl-8 pr-3 text-[13px] text-[var(--text-body)] outline-none focus:border-[var(--border-focus)]"
            />
          </div>
          <button
            type="button"
            onClick={exportCsv}
            className="flex h-[34px] items-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 text-[13px] font-medium text-[var(--text-body)] hover:border-[var(--border-strong)]"
          >
            <Download size={14} strokeWidth={2} />
            Export CSV
          </button>
        </div>
      </div>

      <div className="mt-4 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--surface-sunken)] text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                <th className="px-5 py-2.5 font-semibold">Pesanan</th>
                <th className="px-3 py-2.5 font-semibold">Pelanggan</th>
                <th className="px-3 py-2.5 font-semibold">Item</th>
                <th className="px-3 py-2.5 font-semibold">Slot kirim</th>
                <th className="px-3 py-2.5 text-right font-semibold">Total</th>
                <th className="px-3 py-2.5 font-semibold">Status</th>
                <th className="px-5 py-2.5 font-semibold">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((order, idx) => {
                const tone = STATUS_TONE[order.status] ?? STATUS_TONE.menunggu_konfirmasi;
                return (
                  <tr
                    key={order.id}
                    className={`border-b border-[var(--border-subtle)] last:border-0 ${idx % 2 === 1 ? "bg-[var(--surface-sunken)]/40" : ""}`}
                  >
                    <td className="fh-numeric px-5 py-2.5 font-mono text-[13px]">
                      <Link href={`/admin/pesanan/${order.id}`} className="text-[var(--text-body)] hover:text-[var(--text-link)]">
                        {order.id.slice(0, 8).toUpperCase()}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-[var(--text-body)]">{order.customerNama}</td>
                    <td className="px-3 py-2.5 text-[var(--text-body)]">{order.itemCount} item</td>
                    <td className="fh-numeric px-3 py-2.5 text-[var(--text-body)]">{order.slotLabel}</td>
                    <td className="fh-numeric px-3 py-2.5 text-right font-semibold text-[var(--text-heading)]">
                      {order.totalLabel}
                    </td>
                    <td className="px-3 py-2.5">
                      <span className="rounded-[var(--radius-badge)] px-2 py-1 text-[11px] font-semibold" style={{ background: tone.bg, color: tone.fg }}>
                        {STATUS_LABEL[order.status] ?? order.status}
                      </span>
                      {(() => {
                        if (order.status !== "menunggu_konfirmasi") return null;
                        const jam = Math.floor((Date.now() - new Date(order.createdAtIso).getTime()) / 3600_000);
                        if (jam < PENGINGAT_KONFIRMASI_JAM) return null;
                        return (
                          <span
                            className="ml-1.5 rounded-[var(--radius-badge)] px-2 py-1 text-[11px] font-semibold"
                            style={{ background: "var(--status-danger-bg)", color: "var(--status-danger-fg)" }}
                            title={`Belum dikonfirmasi ${jam} jam`}
                          >
                            Menunggu {jam} jam
                          </span>
                        );
                      })()}
                    </td>
                    <td className="px-5 py-2.5">
                      <div className="flex items-center gap-3">
                        <Link href={`/admin/pesanan/${order.id}`} className="text-[13px] font-medium text-[var(--text-link)] hover:text-[var(--text-link-hover)]">
                          Detail
                        </Link>
                        <a
                          href={`https://wa.me/${order.customerWa.replace(/^0/, "62")}`}
                          target="_blank"
                          rel="noreferrer"
                          aria-label="Chat WhatsApp"
                          className="text-[var(--text-muted)] hover:text-[var(--text-link)]"
                        >
                          <MessageCircle size={16} strokeWidth={1.75} />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-5 py-8 text-center text-[var(--text-muted)]">
                    Tidak ada pesanan di kategori ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
