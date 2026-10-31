"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { submitPaymentProof } from "@/lib/actions/submit-payment";
import type { Bank } from "@/lib/store-settings";
import PaymentCountdown from "./PaymentCountdown";
import QrisTicket from "./QrisTicket";

type LatestPayment = { status: "pending" | "verified" | "rejected" } | null;

export default function PaymentUploadForm({
  orderId,
  latestPayment,
  batasBayar,
  banks,
  qrisImageUrl,
}: {
  orderId: string;
  latestPayment: LatestPayment;
  batasBayar: string | null;
  banks: Bank[];
  qrisImageUrl: string;
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [metode, setMetode] = useState<"transfer_manual" | "qris">("qris");
  const [fileName, setFileName] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (latestPayment?.status === "pending") {
    return (
      <div className="rounded-[var(--radius-card)] border border-[var(--status-info-border)] bg-[var(--status-info-bg)] p-[18px]">
        <p className="text-sm font-semibold text-[var(--status-info-fg)]">Bukti transfer sedang diverifikasi</p>
        <p className="mt-1 text-[13px] leading-relaxed text-[var(--status-info-fg)]">
          Sales akan cek bukti transfer kamu dan mengonfirmasi lewat WhatsApp. Biasanya tidak lama.
        </p>
        {batasBayar && <PaymentCountdown batasBayar={batasBayar} />}
      </div>
    );
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await submitPaymentProof(formData);
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    formRef.current?.reset();
    setFileName(null);
    router.refresh();
  }

  return (
    <div className="flex flex-col gap-3.5 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] p-[18px]">
      <div>
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)]">Cara bayar</h2>
        {batasBayar && <PaymentCountdown batasBayar={batasBayar} />}
      </div>

      {latestPayment?.status === "rejected" && (
        <p className="rounded-[var(--radius-control)] bg-[var(--status-danger-bg)] px-3 py-2 text-[13px] text-[var(--status-danger-fg)]">
          Bukti transfer sebelumnya belum bisa diverifikasi. Silakan upload ulang bukti yang jelas.
        </p>
      )}

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setMetode("qris")}
          className={`h-8 flex-1 rounded-[var(--radius-control)] text-[13px] font-semibold transition-colors ${
            metode === "qris" ? "bg-[var(--surface-brand)] text-[var(--text-on-brand)]" : "border border-[var(--border-default)] text-[var(--text-body)]"
          }`}
        >
          QRIS
        </button>
        <button
          type="button"
          onClick={() => setMetode("transfer_manual")}
          className={`h-8 flex-1 rounded-[var(--radius-control)] text-[13px] font-semibold transition-colors ${
            metode === "transfer_manual" ? "bg-[var(--surface-brand)] text-[var(--text-on-brand)]" : "border border-[var(--border-default)] text-[var(--text-body)]"
          }`}
        >
          Transfer bank
        </button>
      </div>

      {metode === "qris" ? (
        <QrisTicket qrisImageUrl={qrisImageUrl} batasBayar={batasBayar} />
      ) : (
        <div className="flex flex-col gap-2.5">
          {banks.map((bank) => (
            <div key={bank.nama} className="rounded-[var(--radius-control)] bg-[var(--surface-sunken)] px-3.5 py-3 text-sm">
              <p className="text-[var(--text-muted)]">Transfer ke rekening:</p>
              <p className="fh-numeric mt-1 font-semibold text-[var(--text-heading)]">
                {bank.nama} {bank.noRekening}
              </p>
              <p className="text-[var(--text-muted)]">a.n. {bank.atasNama}</p>
            </div>
          ))}
        </div>
      )}

      <form ref={formRef} onSubmit={handleSubmit} className="flex flex-col gap-2.5">
        <input type="hidden" name="orderId" value={orderId} />
        <input type="hidden" name="metode" value={metode} />
        <label className="flex h-10 cursor-pointer items-center justify-center rounded-[var(--radius-control)] border border-dashed border-[var(--border-strong)] text-[13px] font-medium text-[var(--text-body)] hover:border-[var(--border-focus)]">
          {fileName ?? "Pilih foto bukti transfer"}
          <input
            type="file"
            name="bukti"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          />
        </label>
        {error && <p className="text-[13px] text-[var(--status-danger-fg)]">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="h-[42px] rounded-[var(--radius-control)] bg-[var(--action-primary-bg)] text-sm font-semibold text-[var(--text-on-brand)] transition-colors hover:bg-[var(--action-primary-bg-hover)] disabled:opacity-60"
        >
          {loading ? "Mengunggah…" : "Kirim bukti transfer"}
        </button>
      </form>
    </div>
  );
}
