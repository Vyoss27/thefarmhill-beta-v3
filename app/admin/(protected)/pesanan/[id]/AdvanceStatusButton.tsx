"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { advanceOrderStatus } from "@/lib/actions/advance-order";

const LABEL: Record<string, string> = {
  diproses: "Tandai sudah dikirim / siap diambil",
  dikirim: "Tandai selesai",
};

export default function AdvanceStatusButton({ orderId, currentStatus }: { orderId: string; currentStatus: string }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const label = LABEL[currentStatus];
  if (!label) return null;

  async function handleClick() {
    setLoading(true);
    setError(null);
    const result = await advanceOrderStatus({ orderId });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={handleClick}
        disabled={loading}
        className="h-[38px] w-full rounded-[var(--radius-control)] bg-[var(--action-primary-bg)] text-sm font-semibold text-[var(--text-on-brand)] transition-colors hover:bg-[var(--action-primary-bg-hover)] disabled:opacity-60"
      >
        {loading ? "Memproses…" : label}
      </button>
      {error && <p className="mt-1.5 text-[13px] font-medium text-[var(--status-danger-fg)]">{error}</p>}
    </div>
  );
}
