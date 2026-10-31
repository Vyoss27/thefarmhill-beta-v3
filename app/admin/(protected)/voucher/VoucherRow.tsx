"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateVoucher, deleteVoucher } from "@/lib/actions/manage-voucher";
import { formatRupiah } from "@/lib/catalog";

const inputClass =
  "h-8 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-card)] px-2 text-xs outline-none focus:border-[var(--border-focus)]";

function toDateInput(d: Date | null) {
  if (!d) return "";
  return d.toISOString().slice(0, 10);
}

type Voucher = {
  id: string;
  kode: string;
  tipe: "nominal" | "persen";
  nilai: string;
  kuota: number | null;
  minimalBelanja: string | null;
  mulai: Date | null;
  berakhir: Date | null;
};

export default function VoucherRow({ voucher, zebra }: { voucher: Voucher; zebra: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [kode, setKode] = useState(voucher.kode);
  const [tipe, setTipe] = useState(voucher.tipe);
  const [nilai, setNilai] = useState(String(Number(voucher.nilai)));
  const [kuota, setKuota] = useState(voucher.kuota ? String(voucher.kuota) : "");
  const [minimalBelanja, setMinimalBelanja] = useState(voucher.minimalBelanja ? String(Number(voucher.minimalBelanja)) : "");
  const [mulai, setMulai] = useState(toDateInput(voucher.mulai));
  const [berakhir, setBerakhir] = useState(toDateInput(voucher.berakhir));

  function resetFields() {
    setKode(voucher.kode);
    setTipe(voucher.tipe);
    setNilai(String(Number(voucher.nilai)));
    setKuota(voucher.kuota ? String(voucher.kuota) : "");
    setMinimalBelanja(voucher.minimalBelanja ? String(Number(voucher.minimalBelanja)) : "");
    setMulai(toDateInput(voucher.mulai));
    setBerakhir(toDateInput(voucher.berakhir));
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateVoucher({
      id: voucher.id,
      kode,
      tipe,
      nilai: Number(nilai),
      kuota: kuota ? Number(kuota) : undefined,
      minimalBelanja: minimalBelanja ? Number(minimalBelanja) : undefined,
      mulai: mulai || undefined,
      berakhir: berakhir || undefined,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm(`Hapus voucher ${voucher.kode}?`)) return;
    setSaving(true);
    setError(null);
    const result = await deleteVoucher(voucher.id);
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  const rowClass = `border-b border-[var(--border-subtle)] last:border-0 align-top ${zebra ? "bg-[var(--surface-sunken)]/40" : ""}`;

  if (!editing) {
    const kedaluwarsa = voucher.berakhir && voucher.berakhir < new Date();
    return (
      <tr className={rowClass}>
        <td className="fh-numeric px-5 py-2.5 font-mono font-medium text-[var(--text-heading)]">{voucher.kode}</td>
        <td className="px-3 py-2.5 capitalize text-[var(--text-body)]">{voucher.tipe}</td>
        <td className="fh-numeric px-3 py-2.5 text-right font-semibold text-[var(--text-heading)]">
          {voucher.tipe === "persen" ? `${Number(voucher.nilai)}%` : formatRupiah(Number(voucher.nilai))}
        </td>
        <td className="fh-numeric px-3 py-2.5 text-right text-[var(--text-body)]">{voucher.kuota ?? "∞"}</td>
        <td className="px-5 py-2.5 text-[var(--text-body)]">
          {voucher.mulai && voucher.berakhir ? (
            <span className={kedaluwarsa ? "text-[var(--status-danger-fg)]" : ""}>
              {voucher.mulai.toLocaleDateString("id-ID", { timeZone: "UTC" })} – {voucher.berakhir.toLocaleDateString("id-ID", { timeZone: "UTC" })}
              {kedaluwarsa ? " (berakhir)" : ""}
            </span>
          ) : (
            "—"
          )}
        </td>
        <td className="px-3 py-2.5 text-right">
          <div className="flex justify-end gap-1.5">
            <button
              type="button"
              onClick={() => setEditing(true)}
              className="rounded-[var(--radius-control)] border border-[var(--border-default)] px-2.5 py-1 text-[12px] font-medium text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={handleDelete}
              disabled={saving}
              className="rounded-[var(--radius-control)] border border-[var(--status-danger-fg)]/40 px-2.5 py-1 text-[12px] font-medium text-[var(--status-danger-fg)] hover:bg-[var(--status-danger-bg)] disabled:opacity-60"
            >
              Hapus
            </button>
          </div>
          {error && <p className="mt-1 max-w-[180px] text-[11px] text-[var(--status-danger-fg)]">{error}</p>}
        </td>
      </tr>
    );
  }

  return (
    <tr className={rowClass}>
      <td className="px-5 py-2.5">
        <input value={kode} onChange={(e) => setKode(e.target.value.toUpperCase())} className={`${inputClass} w-28 font-mono uppercase`} />
      </td>
      <td className="px-3 py-2.5">
        <select value={tipe} onChange={(e) => setTipe(e.target.value as "nominal" | "persen")} className={inputClass}>
          <option value="nominal">nominal</option>
          <option value="persen">persen</option>
        </select>
      </td>
      <td className="px-3 py-2.5">
        <input type="number" min={0} value={nilai} onChange={(e) => setNilai(e.target.value)} className={`${inputClass} w-24`} />
      </td>
      <td className="px-3 py-2.5">
        <input type="number" min={1} value={kuota} onChange={(e) => setKuota(e.target.value)} placeholder="∞" className={`${inputClass} w-20`} />
      </td>
      <td className="px-5 py-2.5">
        <div className="flex flex-col gap-1">
          <input type="date" value={mulai} onChange={(e) => setMulai(e.target.value)} className={inputClass} />
          <input type="date" value={berakhir} onChange={(e) => setBerakhir(e.target.value)} className={inputClass} />
        </div>
      </td>
      <td className="px-3 py-2.5 text-right">
        <div className="flex justify-end gap-1.5">
          <button
            type="button"
            disabled={saving}
            onClick={handleSave}
            className="rounded-[var(--radius-control)] bg-[var(--action-primary-bg)] px-2.5 py-1 text-[12px] font-semibold text-[var(--text-on-brand)] disabled:opacity-60"
          >
            {saving ? "…" : "Simpan"}
          </button>
          <button
            type="button"
            onClick={() => {
              setEditing(false);
              resetFields();
            }}
            className="rounded-[var(--radius-control)] border border-[var(--border-default)] px-2.5 py-1 text-[12px] text-[var(--text-body)]"
          >
            Batal
          </button>
        </div>
        {error && <p className="mt-1 max-w-[180px] text-[11px] text-[var(--status-danger-fg)]">{error}</p>}
      </td>
    </tr>
  );
}
