"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateStoreSetting } from "@/lib/actions/manage-settings";
import type { Bank, StoreSettingData } from "@/lib/store-settings";

const inputClass =
  "h-10 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 text-sm outline-none focus:border-[var(--border-focus)]";

export default function StoreSettingForm({ setting }: { setting: StoreSettingData }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [namaGudang, setNamaGudang] = useState(setting.namaGudang);
  const [alamatGudang, setAlamatGudang] = useState(setting.alamatGudang);
  const [banks, setBanks] = useState<Bank[]>(setting.banks.length > 0 ? setting.banks : [{ nama: "", noRekening: "", atasNama: "" }]);

  function resetFields() {
    setNamaGudang(setting.namaGudang);
    setAlamatGudang(setting.alamatGudang);
    setBanks(setting.banks.length > 0 ? setting.banks : [{ nama: "", noRekening: "", atasNama: "" }]);
    setError(null);
  }

  function updateBank(idx: number, field: keyof Bank, value: string) {
    setBanks((prev) => prev.map((b, i) => (i === idx ? { ...b, [field]: value } : b)));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);
    const result = await updateStoreSetting({
      namaGudang,
      alamatGudang,
      banks: banks.filter((b) => b.nama.trim() || b.noRekening.trim() || b.atasNama.trim()),
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="mt-3 h-9 rounded-[var(--radius-control)] border border-[var(--border-default)] px-3.5 text-[13px] font-semibold text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
      >
        Edit pengaturan
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-3 flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] p-5"
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-[var(--text-body)]">Nama gudang</label>
          <input value={namaGudang} onChange={(e) => setNamaGudang(e.target.value)} required className={inputClass} />
        </div>
        <div className="flex flex-col gap-1.5">
          <label className="text-[13px] font-semibold text-[var(--text-body)]">Alamat</label>
          <input value={alamatGudang} onChange={(e) => setAlamatGudang(e.target.value)} required className={inputClass} />
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label className="text-[13px] font-semibold text-[var(--text-body)]">Rekening transfer bank</label>
          <button
            type="button"
            onClick={() => setBanks((prev) => [...prev, { nama: "", noRekening: "", atasNama: "" }])}
            className="text-[12.5px] font-semibold text-[var(--text-link)] hover:text-[var(--text-link-hover)]"
          >
            + Tambah rekening
          </button>
        </div>
        <div className="mt-2 flex flex-col gap-2">
          {banks.map((bank, idx) => (
            <div key={idx} className="grid grid-cols-1 gap-1.5 rounded-[var(--radius-control)] bg-[var(--surface-sunken)] p-2.5 sm:grid-cols-[1fr_1fr_1.3fr_auto]">
              <input
                value={bank.nama}
                onChange={(e) => updateBank(idx, "nama", e.target.value)}
                placeholder="Nama bank (mis. BCA)"
                className={inputClass}
              />
              <input
                value={bank.noRekening}
                onChange={(e) => updateBank(idx, "noRekening", e.target.value)}
                placeholder="Nomor rekening"
                className={`${inputClass} fh-numeric`}
              />
              <input
                value={bank.atasNama}
                onChange={(e) => updateBank(idx, "atasNama", e.target.value)}
                placeholder="Atas nama"
                className={inputClass}
              />
              <button
                type="button"
                onClick={() => setBanks((prev) => prev.filter((_, i) => i !== idx))}
                className="h-10 rounded-[var(--radius-control)] border border-[var(--status-danger-fg)]/40 px-3 text-[12.5px] font-medium text-[var(--status-danger-fg)] hover:bg-[var(--status-danger-bg)]"
              >
                Hapus
              </button>
            </div>
          ))}
        </div>
        <p className="mt-1.5 text-[12px] text-[var(--text-muted)]">
          QRIS masih diganti lewat file di kode (<code className="fh-numeric">public/payment/qris-farmhill.png</code>) — upload
          gambar dari panel belum dibangun.
        </p>
      </div>

      {error && <p className="text-[13px] font-medium text-[var(--status-danger-fg)]">{error}</p>}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="h-9 rounded-[var(--radius-control)] bg-[var(--action-primary-bg)] px-3.5 text-[13px] font-semibold text-[var(--text-on-brand)] hover:bg-[var(--action-primary-bg-hover)] disabled:opacity-60"
        >
          {saving ? "Menyimpan…" : "Simpan pengaturan"}
        </button>
        <button
          type="button"
          onClick={() => {
            setEditing(false);
            resetFields();
          }}
          className="h-9 rounded-[var(--radius-control)] border border-[var(--border-default)] px-3.5 text-[13px] text-[var(--text-body)]"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
