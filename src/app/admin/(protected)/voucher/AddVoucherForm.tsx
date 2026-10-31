"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createVoucher } from "@/lib/actions/manage-voucher";

const inputClass =
  "h-10 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 text-sm outline-none focus:border-[var(--border-focus)]";

export default function AddVoucherForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [kode, setKode] = useState("");
  const [tipe, setTipe] = useState<"nominal" | "persen">("nominal");
  const [nilai, setNilai] = useState("");
  const [kuota, setKuota] = useState("");
  const [minimalBelanja, setMinimalBelanja] = useState("");
  const [mulai, setMulai] = useState("");
  const [berakhir, setBerakhir] = useState("");

  function reset() {
    setKode("");
    setTipe("nominal");
    setNilai("");
    setKuota("");
    setMinimalBelanja("");
    setMulai("");
    setBerakhir("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await createVoucher({
      kode,
      tipe,
      nilai: Number(nilai),
      kuota: kuota ? Number(kuota) : undefined,
      minimalBelanja: minimalBelanja ? Number(minimalBelanja) : undefined,
      mulai: mulai || undefined,
      berakhir: berakhir || undefined,
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    reset();
    setOpen(false);
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-9 rounded-[var(--radius-control)] bg-[var(--action-primary-bg)] px-3.5 text-[13px] font-semibold text-[var(--text-on-brand)] hover:bg-[var(--action-primary-bg-hover)]"
      >
        + Tambah voucher
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input
          value={kode}
          onChange={(e) => setKode(e.target.value.toUpperCase())}
          placeholder="Kode (mis. HEMAT10)"
          required
          className={`${inputClass} font-mono uppercase`}
        />
        <select value={tipe} onChange={(e) => setTipe(e.target.value as "nominal" | "persen")} className={inputClass}>
          <option value="nominal">Potongan nominal (Rp)</option>
          <option value="persen">Potongan persen (%)</option>
        </select>
        <input
          type="number"
          min={0}
          max={tipe === "persen" ? 100 : undefined}
          value={nilai}
          onChange={(e) => setNilai(e.target.value)}
          placeholder={tipe === "persen" ? "Nilai (mis. 10 = 10%)" : "Nilai (Rp)"}
          required
          className={inputClass}
        />
        <input
          type="number"
          min={1}
          value={kuota}
          onChange={(e) => setKuota(e.target.value)}
          placeholder="Kuota (kosongkan = tanpa batas)"
          className={inputClass}
        />
        <input
          type="number"
          min={0}
          value={minimalBelanja}
          onChange={(e) => setMinimalBelanja(e.target.value)}
          placeholder="Minimal belanja (opsional)"
          className={inputClass}
        />
        <input type="date" value={mulai} onChange={(e) => setMulai(e.target.value)} className={inputClass} />
        <input type="date" value={berakhir} onChange={(e) => setBerakhir(e.target.value)} className={inputClass} />
      </div>
      {error && <p className="text-[13px] font-medium text-[var(--status-danger-fg)]">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="h-9 rounded-[var(--radius-control)] bg-[var(--action-primary-bg)] px-3.5 text-[13px] font-semibold text-[var(--text-on-brand)] hover:bg-[var(--action-primary-bg-hover)] disabled:opacity-60"
        >
          {loading ? "Menyimpan…" : "Simpan voucher"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="h-9 rounded-[var(--radius-control)] border border-[var(--border-default)] px-3.5 text-[13px] text-[var(--text-body)]"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
