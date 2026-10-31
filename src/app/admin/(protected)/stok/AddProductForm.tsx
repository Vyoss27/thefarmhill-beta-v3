"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProduct } from "@/lib/actions/manage-product";
import { CATEGORY_LABEL } from "@/lib/catalog";

const CATEGORY_OPTIONS = Object.keys(CATEGORY_LABEL);

const inputClass =
  "h-10 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 text-sm outline-none focus:border-[var(--border-focus)]";

export default function AddProductForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nama, setNama] = useState("");
  const [jenisItem, setJenisItem] = useState(CATEGORY_OPTIONS[0]);
  const [asalKebun, setAsalKebun] = useState("");
  const [satuan, setSatuan] = useState("kg");
  const [harga, setHarga] = useState("");
  const [minOrder, setMinOrder] = useState("1");
  const [stokAwal, setStokAwal] = useState("0");
  const [aktifkan, setAktifkan] = useState(true);

  function reset() {
    setNama("");
    setJenisItem(CATEGORY_OPTIONS[0]);
    setAsalKebun("");
    setSatuan("kg");
    setHarga("");
    setMinOrder("1");
    setStokAwal("0");
    setAktifkan(true);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await createProduct({
      nama,
      jenisItem: jenisItem as never,
      asalKebun: asalKebun || undefined,
      satuan,
      harga: Number(harga),
      minOrder: Number(minOrder),
      stokAwal: Number(stokAwal),
      aktifkan,
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
        + Tambah produk baru
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama produk" required className={inputClass} />
        <select value={jenisItem} onChange={(e) => setJenisItem(e.target.value)} className={inputClass}>
          {CATEGORY_OPTIONS.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>
        <input value={asalKebun} onChange={(e) => setAsalKebun(e.target.value)} placeholder="Asal (opsional)" className={inputClass} />
        <input value={satuan} onChange={(e) => setSatuan(e.target.value)} placeholder="Satuan (kg/ons/pack/…)" required className={inputClass} />
        <input
          type="number"
          min={0}
          value={harga}
          onChange={(e) => setHarga(e.target.value)}
          placeholder="Harga (Rp)"
          required
          className={inputClass}
        />
        <input
          type="number"
          min={1}
          value={minOrder}
          onChange={(e) => setMinOrder(e.target.value)}
          placeholder="Min. order"
          className={inputClass}
        />
        <input
          type="number"
          min={0}
          value={stokAwal}
          onChange={(e) => setStokAwal(e.target.value)}
          placeholder="Stok awal"
          className={inputClass}
        />
        <label className="flex items-center gap-2 text-sm text-[var(--text-body)]">
          <input type="checkbox" checked={aktifkan} onChange={(e) => setAktifkan(e.target.checked)} />
          Tayangkan di katalog sekarang
        </label>
      </div>
      {error && <p className="text-[13px] font-medium text-[var(--status-danger-fg)]">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="h-9 rounded-[var(--radius-control)] bg-[var(--action-primary-bg)] px-3.5 text-[13px] font-semibold text-[var(--text-on-brand)] hover:bg-[var(--action-primary-bg-hover)] disabled:opacity-60"
        >
          {loading ? "Menyimpan…" : "Simpan produk"}
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
