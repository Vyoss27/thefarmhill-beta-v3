"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { confirmPayment, rejectPayment } from "@/lib/actions/confirm-payment";
import { formatRupiah } from "@/lib/catalog";

export default function PaymentVerificationPanel({
  paymentId,
  metode,
  nominal,
  buktiSignedUrl,
  waktu,
}: {
  paymentId: string;
  metode: string;
  nominal: number;
  buktiSignedUrl: string | null;
  waktu: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState<"confirm" | "reject" | null>(null);
  const [rejecting, setRejecting] = useState(false);
  const [alasan, setAlasan] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function handleConfirm() {
    setLoading("confirm");
    setError(null);
    const result = await confirmPayment({ paymentId });
    setLoading(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  async function handleReject() {
    setLoading("reject");
    setError(null);
    const result = await rejectPayment({ paymentId, alasan: alasan || undefined });
    setLoading(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div className="mt-3 flex flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--status-accent-border,var(--border-accent))] bg-[var(--status-accent-bg)] p-4">
      <p className="text-sm font-semibold text-[var(--status-accent-fg)]">Bukti bayar masuk — perlu diverifikasi</p>
      <p className="text-[13px] text-[var(--status-accent-fg)]">
        {metode === "qris" ? "QRIS" : "Transfer bank"} · {formatRupiah(nominal)} ·{" "}
        {new Date(waktu).toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })}
      </p>
      {buktiSignedUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={buktiSignedUrl} alt="Bukti transfer" className="max-h-[320px] w-fit rounded-[var(--radius-control)] border border-[var(--border-default)] object-contain" />
      )}

      {error && <p className="text-[13px] font-medium text-[var(--status-danger-fg)]">{error}</p>}

      {rejecting ? (
        <div className="flex flex-col gap-2">
          <input
            value={alasan}
            onChange={(e) => setAlasan(e.target.value)}
            placeholder="Alasan (opsional) — mis. jumlah tidak sesuai"
            className="h-9 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 text-sm outline-none"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleReject}
              disabled={loading !== null}
              className="h-[34px] flex-1 rounded-[var(--radius-control)] bg-[var(--action-danger-bg)] text-sm font-semibold text-white disabled:opacity-60"
            >
              {loading === "reject" ? "Memproses…" : "Ya, tolak"}
            </button>
            <button
              type="button"
              onClick={() => setRejecting(false)}
              disabled={loading !== null}
              className="h-[34px] flex-1 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-card)] text-sm text-[var(--text-body)]"
            >
              Batal
            </button>
          </div>
        </div>
      ) : (
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={loading !== null}
            className="h-[38px] flex-1 rounded-[var(--radius-control)] bg-[var(--action-primary-bg)] text-sm font-semibold text-[var(--text-on-brand)] hover:bg-[var(--action-primary-bg-hover)] disabled:opacity-60"
          >
            {loading === "confirm" ? "Memproses…" : "Tandai lunas"}
          </button>
          <button
            type="button"
            onClick={() => setRejecting(true)}
            disabled={loading !== null}
            className="h-[38px] flex-1 rounded-[var(--radius-control)] border border-[var(--status-danger-border)] text-sm font-semibold text-[var(--status-danger-fg)] hover:bg-[var(--status-danger-bg)]"
          >
            Tolak
          </button>
        </div>
      )}
    </div>
  );
}
