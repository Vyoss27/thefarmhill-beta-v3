"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { formatRupiah } from "@/lib/catalog";
import { confirmOrder } from "@/lib/actions/confirm-order";
import { estimateOngkir } from "@/lib/actions/estimate-ongkir";

function toDigits(value: string) {
  return value.replace(/\D/g, "");
}

function formatThousands(digits: string) {
  if (!digits) return "";
  return Number(digits).toLocaleString("id-ID");
}

export default function ConfirmOrderForm({
  orderId,
  subtotal,
  metodeTerima,
  diskonAwal,
  voucherKode,
}: {
  orderId: string;
  subtotal: number;
  metodeTerima: string;
  diskonAwal?: number;
  voucherKode?: string | null;
}) {
  const router = useRouter();
  const [ongkir, setOngkir] = useState("");
  const [diskon, setDiskon] = useState(diskonAwal ? String(diskonAwal) : "");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [estimating, setEstimating] = useState(false);
  const [estimateInfo, setEstimateInfo] = useState<string | null>(null);

  async function handleEstimate() {
    setEstimating(true);
    setError(null);
    setEstimateInfo(null);
    const result = await estimateOngkir({ orderId });
    setEstimating(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setOngkir(String(result.ongkir));
    setEstimateInfo(`Jarak tempuh ±${result.km.toFixed(1)} km — silakan cek/timpa kalau perlu.`);
  }

  const ongkirNum = Number(ongkir) || 0;
  const diskonNum = Number(diskon) || 0;
  const total = subtotal - diskonNum + ongkirNum;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (ongkir.trim() === "") {
      setError("Ongkir wajib diisi (BR-01) — tidak ada tarif otomatis.");
      return;
    }
    setSubmitting(true);
    const result = await confirmOrder({ orderId, ongkir: ongkirNum, diskon: diskonNum });
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
      <h2 className="text-sm font-semibold text-[var(--text-heading)]">Konfirmasi &amp; tetapkan ongkir</h2>

      <div className="flex flex-col gap-1.5">
        <div className="flex items-center justify-between">
          <label className="text-[13px] font-semibold text-[var(--text-body)]" htmlFor="ongkir">
            Ongkir (Rp)
          </label>
          {metodeTerima !== "ambil_sendiri" && (
            <button
              type="button"
              onClick={handleEstimate}
              disabled={estimating}
              className="text-[12.5px] font-semibold text-[var(--text-link)] hover:text-[var(--text-link-hover)] disabled:opacity-60"
            >
              {estimating ? "Menghitung…" : "Hitung otomatis"}
            </button>
          )}
        </div>
        <input
          id="ongkir"
          type="text"
          inputMode="numeric"
          required
          value={formatThousands(ongkir)}
          onChange={(e) => setOngkir(toDigits(e.target.value))}
          placeholder="mis. 20.000"
          className="fh-numeric h-10 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 text-sm text-[var(--text-body)] outline-none transition-[border-color,box-shadow] focus:border-[var(--border-focus)] focus:shadow-[var(--shadow-focus)]"
        />
        {estimateInfo && <p className="text-[12.5px] text-[var(--text-muted)]">{estimateInfo}</p>}
      </div>

      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-semibold text-[var(--text-body)]" htmlFor="diskon">
          Diskon (Rp{voucherKode ? ` — sudah termasuk voucher ${voucherKode}` : ", opsional"})
        </label>
        <input
          id="diskon"
          type="text"
          inputMode="numeric"
          value={formatThousands(diskon)}
          onChange={(e) => setDiskon(toDigits(e.target.value))}
          placeholder="0"
          className="fh-numeric h-10 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 text-sm text-[var(--text-body)] outline-none transition-[border-color,box-shadow] focus:border-[var(--border-focus)] focus:shadow-[var(--shadow-focus)]"
        />
      </div>

      <div className="flex justify-between rounded-[var(--radius-control)] bg-[var(--surface-sunken)] px-4 py-3 text-sm">
        <span className="font-semibold text-[var(--text-heading)]">Total tagihan</span>
        <span className="fh-numeric font-semibold text-[var(--text-heading)]">{formatRupiah(total)}</span>
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
        {submitting ? "Memproses…" : "Tandai dikonfirmasi & kirim tagihan"}
      </button>
    </form>
  );
}
