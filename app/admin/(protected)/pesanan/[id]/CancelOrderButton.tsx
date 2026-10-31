"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { cancelOrder } from "@/lib/actions/cancel-order";
import { ALASAN_BATAL, type AlasanBatalKode } from "@/lib/order-cancel";

export default function CancelOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [alasan, setAlasan] = useState<AlasanBatalKode>("size_habis");
  const [catatan, setCatatan] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    const result = await cancelOrder({ orderId, alasan, catatan: catatan.trim() || undefined });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-[34px] w-fit rounded-[var(--radius-control)] border border-[var(--status-danger-border)] px-3 text-sm font-medium text-[var(--status-danger-fg)] hover:bg-[var(--status-danger-bg)]"
      >
        Batalkan pesanan
      </button>
    );
  }

  return (
    <div className="rounded-[var(--radius-control)] border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] p-3">
      <p className="text-sm text-[var(--status-danger-fg)]">
        Pesanan dibatalkan, stok yang ditahan dilepas, dan pelanggan dikabari lewat WhatsApp beserta alasannya.
      </p>
      <label className="mt-2.5 block text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--status-danger-fg)]">
        Alasan
        <select
          value={alasan}
          onChange={(e) => setAlasan(e.target.value as AlasanBatalKode)}
          disabled={loading}
          className="mt-1 h-[34px] w-full rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-card)] px-2 text-sm font-normal normal-case tracking-normal text-[var(--text-body)]"
        >
          {(Object.keys(ALASAN_BATAL) as AlasanBatalKode[]).map((k) => (
            <option key={k} value={k}>
              {ALASAN_BATAL[k]}
            </option>
          ))}
        </select>
      </label>
      <input
        type="text"
        value={catatan}
        maxLength={200}
        onChange={(e) => setCatatan(e.target.value)}
        disabled={loading}
        placeholder={alasan === "lainnya" ? "Tulis alasan (wajib)" : "Catatan tambahan (opsional)"}
        className="mt-2 h-[34px] w-full rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-card)] px-2 text-sm text-[var(--text-body)] outline-none focus:border-[var(--border-focus)]"
      />
      {error && <p className="mt-1.5 text-sm font-medium text-[var(--status-danger-fg)]">{error}</p>}
      <div className="mt-2.5 flex gap-2">
        <button
          type="button"
          onClick={handleConfirm}
          disabled={loading}
          className="h-[34px] rounded-[var(--radius-control)] bg-[var(--action-danger-bg)] px-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--status-danger-fg)] disabled:opacity-60"
        >
          {loading ? "Memproses…" : "Ya, batalkan"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          disabled={loading}
          className="h-[34px] rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 text-sm text-[var(--text-body)] hover:border-[var(--border-strong)]"
        >
          Kembali
        </button>
      </div>
    </div>
  );
}
