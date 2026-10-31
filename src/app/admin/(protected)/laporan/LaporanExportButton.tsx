"use client";

import { Download } from "lucide-react";

export type ProdukRow = { produk: string; jenis: string; sat: string; qty: number; nilai: number };

export default function LaporanExportButton({ rows }: { rows: ProdukRow[] }) {
  function exportCsv() {
    const header = ["Produk", "Jenis item", "Sat", "Terjual", "Nilai (Rp)"];
    const csv = [header, ...rows.map((r) => [r.produk, r.jenis, r.sat, r.qty, r.nilai])]
      .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `produk-terlaris-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <button
      type="button"
      onClick={exportCsv}
      className="flex h-[28px] items-center gap-1.5 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-card)] px-2.5 text-[13px] font-medium text-[var(--text-body)] hover:border-[var(--border-strong)]"
    >
      <Download size={13} strokeWidth={2} />
      Export CSV
    </button>
  );
}
