"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveBeratAktual } from "@/lib/actions/confirm-weight";
import { formatRupiah } from "@/lib/catalog";

type Item = {
  orderItemId: string;
  nama: string;
  ukuran: string;
  qtyKgDiminta: number;
  butirDiminta: number | null;
  hargaPerKg: number;
};

export default function WeighInForm({ orderId, items }: { orderId: string; items: Item[] }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const allFilled = items.every((i) => Number(values[i.orderItemId]) > 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!allFilled) {
      setError("Isi berat aktual untuk semua item dulu.");
      return;
    }

    setSubmitting(true);
    const result = await saveBeratAktual({
      orderId,
      items: items.map((i) => ({ orderItemId: i.orderItemId, beratAktual: Number(values[i.orderItemId]) })),
    });
    setSubmitting(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3.5 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] p-5"
      style={{ borderTop: "3px solid var(--border-accent)" }}
    >
      <h2 className="text-sm font-semibold text-[var(--text-heading)]">Timbang &amp; konfirmasi berat</h2>
      <p className="text-[13px] text-[var(--text-muted)]">
        Item ini dijual per-kg tapi dipesan per-butir — isi berat aktual hasil timbangan supaya harga final terhitung
        otomatis sebelum lanjut ke ongkir.
      </p>

      <div className="flex flex-col gap-3">
        {items.map((item) => {
          const value = values[item.orderItemId] ?? "";
          const estimasi = value ? Number(value) * item.hargaPerKg : null;
          return (
            <div key={item.orderItemId} className="flex flex-col gap-1.5 rounded-[var(--radius-control)] bg-[var(--surface-sunken)] p-3">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium text-[var(--text-heading)]">
                  {item.nama} · {item.ukuran}{" "}
                  {item.butirDiminta ? `× ${item.butirDiminta} butir (≈${item.qtyKgDiminta} kg)` : `≈${item.qtyKgDiminta} kg diminta`}
                </span>
                <span className="fh-numeric text-[var(--text-muted)]">{formatRupiah(item.hargaPerKg)}/kg</span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  step="0.01"
                  min={0}
                  value={value}
                  onChange={(e) => setValues((prev) => ({ ...prev, [item.orderItemId]: e.target.value }))}
                  placeholder="Berat aktual (kg)"
                  className="h-9 w-40 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-card)] px-2.5 text-sm outline-none focus:border-[var(--border-focus)]"
                />
                {estimasi !== null && (
                  <span className="fh-numeric text-sm font-semibold text-[var(--text-heading)]">= {formatRupiah(estimasi)}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {error && (
        <p className="rounded-[var(--radius-control)] bg-[var(--status-danger-bg)] px-3 py-2 text-sm text-[var(--status-danger-fg)]">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={submitting}
        className="h-[42px] rounded-[var(--radius-control)] bg-[var(--action-primary-bg)] text-sm font-semibold text-[var(--text-on-brand)] transition-colors hover:bg-[var(--action-primary-bg-hover)] disabled:opacity-60"
      >
        {submitting ? "Menyimpan…" : "Simpan berat & lanjut ke ongkir"}
      </button>
    </form>
  );
}
