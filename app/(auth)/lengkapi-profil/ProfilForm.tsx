"use client";

import { useState } from "react";
import { completeGoogleProfile } from "@/lib/actions/customer-account";

export default function ProfilForm({ namaAwal }: { namaAwal: string }) {
  const [nama, setNama] = useState(namaAwal);
  const [wa, setWa] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await completeGoogleProfile({ nama, wa });
    if (!result.ok) {
      setLoading(false);
      setError(result.error);
      return;
    }
    // Navigasi penuh supaya header storefront membaca data pelanggan yang baru tersimpan.
    window.location.href = "/";
  }

  const inputClass =
    "h-12 rounded-xl border border-transparent bg-[var(--surface-sunken)] px-3.5 text-[15px] text-[var(--text-body)] outline-none transition-[border-color,box-shadow] placeholder:text-[var(--text-subtle)] focus:border-[var(--border-focus)] focus:bg-[var(--surface-card)] focus:shadow-[var(--shadow-focus)]";

  return (
    <form onSubmit={handleSubmit} className="mt-6 flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <label htmlFor="nama" className="text-[13px] font-semibold text-[var(--text-body)]">
          Nama
        </label>
        <input id="nama" required minLength={2} autoComplete="name" value={nama} onChange={(e) => setNama(e.target.value)} className={inputClass} />
      </div>
      <div className="flex flex-col gap-1.5">
        <label htmlFor="wa" className="text-[13px] font-semibold text-[var(--text-body)]">
          Nomor WhatsApp
        </label>
        <input
          id="wa"
          type="tel"
          inputMode="tel"
          required
          minLength={8}
          autoComplete="tel"
          placeholder="08xxxxxxxxxx"
          value={wa}
          onChange={(e) => setWa(e.target.value)}
          className={inputClass}
        />
      </div>
      {error && (
        <p className="rounded-[var(--radius-control)] bg-[var(--status-danger-bg)] px-3 py-2 text-sm text-[var(--status-danger-fg)]">{error}</p>
      )}
      <button
        type="submit"
        disabled={loading}
        className="h-12 rounded-xl bg-[var(--action-primary-bg)] text-[15px] font-semibold text-[var(--text-on-brand)] transition-colors hover:bg-[var(--action-primary-bg-hover)] disabled:opacity-60"
      >
        {loading ? "Menyimpan…" : "Simpan & lanjut belanja"}
      </button>
    </form>
  );
}
