"use client";

import { useState } from "react";
import { suggestProduct } from "@/lib/actions/suggest-product";

export default function SarankanProdukForm() {
  const [saran, setSaran] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await suggestProduct({ saran });
    setLoading(false);
    if (!result.ok) {
      setError(result.error === "login_required" ? "Masuk dulu buat kirim saran." : result.error);
      return;
    }
    setSuccess(true);
    setSaran("");
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-5 flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-xs)]"
    >
      <div className="flex flex-col gap-1.5">
        <label className="text-[13px] font-semibold text-[var(--text-body)]" htmlFor="saran">
          Produk apa yang kamu mau ada di Farmhill Store?
        </label>
        <textarea
          id="saran"
          required
          minLength={3}
          rows={4}
          value={saran}
          onChange={(e) => setSaran(e.target.value)}
          placeholder="Mis. jus semangka, melon golden, dst"
          className="h-auto resize-none rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-2 text-sm text-[var(--text-body)] outline-none transition-[border-color,box-shadow] focus:border-[var(--border-focus)] focus:shadow-[var(--shadow-focus)]"
        />
      </div>

      {error && (
        <p className="rounded-[var(--radius-control)] bg-[var(--status-danger-bg)] px-3 py-2 text-sm text-[var(--status-danger-fg)]">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-[var(--radius-control)] bg-[var(--status-success-bg)] px-3 py-2 text-sm text-[var(--status-success-fg)]">
          Makasih! Saran kamu udah dikirim ke tim Farmhill Store.
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="h-[42px] rounded-[var(--radius-control)] bg-[var(--action-primary-bg)] text-sm font-semibold text-[var(--text-on-brand)] transition-colors hover:bg-[var(--action-primary-bg-hover)] disabled:opacity-60"
      >
        {loading ? "Mengirim…" : "Kirim saran"}
      </button>
    </form>
  );
}
