"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { expireOrderManually } from "@/lib/actions/expire-order";

export default function ExpireOrderButton({ orderId }: { orderId: string }) {
  const router = useRouter();
  const [confirming, setConfirming] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading(true);
    setError(null);
    const result = await expireOrderManually({ orderId });
    setLoading(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  if (confirming) {
    return (
      <div className="mt-2 rounded-[var(--radius-control)] border border-[var(--status-danger-border)] bg-[var(--status-danger-bg)] p-3">
        <p className="text-sm text-[var(--status-danger-fg)]">
          Yakin tandai pesanan ini kedaluwarsa? Stok yang ditahan akan dilepas dan pelanggan dikabari lewat WhatsApp.
        </p>
        {error && <p className="mt-1 text-sm font-medium text-[var(--status-danger-fg)]">{error}</p>}
        <div className="mt-2.5 flex gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading}
            className="h-[34px] rounded-[var(--radius-control)] bg-[var(--action-danger-bg)] px-3 text-sm font-semibold text-white transition-colors hover:bg-[var(--status-danger-fg)] disabled:opacity-60"
          >
            {loading ? "Memproses…" : "Ya, tandai kedaluwarsa"}
          </button>
          <button
            type="button"
            onClick={() => {
              setConfirming(false);
              setError(null);
            }}
            disabled={loading}
            className="h-[34px] rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 text-sm text-[var(--text-body)] hover:border-[var(--border-strong)]"
          >
            Batal
          </button>
        </div>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="mt-2 h-[34px] w-fit rounded-[var(--radius-control)] border border-[var(--status-danger-border)] px-3 text-sm font-medium text-[var(--status-danger-fg)] hover:bg-[var(--status-danger-bg)]"
    >
      Tandai kedaluwarsa
    </button>
  );
}
