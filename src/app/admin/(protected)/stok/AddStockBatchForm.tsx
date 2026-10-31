"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { recordStockBatch } from "@/lib/actions/manage-stock-batch";
import { INTAKE_GRADES, type IntakeGradeKode } from "@/lib/melon-grade";

type ProductOption = {
  id: string;
  nama: string;
  isMelon: boolean;
  sizeUnits: { id: string; ukuran: string }[];
  flatUnits: { id: string; satuan: string; grade: string | null }[];
};

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

const inputClass =
  "h-10 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 text-sm outline-none focus:border-[var(--border-focus)]";

export default function AddStockBatchForm({ products }: { products: ProductOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [productId, setProductId] = useState("");
  const [grade, setGrade] = useState<IntakeGradeKode | "">("");
  const [saleUnitId, setSaleUnitId] = useState("");
  const [jumlah, setJumlah] = useState("");
  const [tanggalMasuk, setTanggalMasuk] = useState(todayStr());
  const [bestBefore, setBestBefore] = useState("");
  const [lokasiSimpan, setLokasiSimpan] = useState("");
  const [catatan, setCatatan] = useState("");

  const selectedProduct = useMemo(() => products.find((p) => p.id === productId), [products, productId]);
  const isMelon = !!selectedProduct?.isMelon;
  const needsSize = !isMelon ? !!selectedProduct && selectedProduct.sizeUnits.length > 0 : false; // melon Perfect: satu kolam stok, tanpa pilih size
  const flatTargets = isMelon && grade && grade !== "perfect" ? (selectedProduct?.flatUnits ?? []) : [];

  function reset() {
    setProductId("");
    setGrade("");
    setSaleUnitId("");
    setJumlah("");
    setTanggalMasuk(todayStr());
    setBestBefore("");
    setLokasiSimpan("");
    setCatatan("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (isMelon && !grade) {
      setError("Pilih grade panen (Perfect/Imperfect/Outspec).");
      return;
    }
    if (needsSize && !saleUnitId) {
      setError("Pilih size tujuan batch — produk ini dijual per-ukuran.");
      return;
    }

    setLoading(true);
    const result = await recordStockBatch({
      productId,
      saleUnitId: saleUnitId || undefined,
      jumlah: Number(jumlah),
      tanggalMasuk,
      bestBefore: bestBefore || undefined,
      grade: isMelon ? grade : undefined,
      lokasiSimpan: lokasiSimpan || undefined,
      catatan: catatan || undefined,
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess(`Stok masuk tercatat — ${jumlah}${needsSize || flatTargets.length > 0 ? " kg" : ""} ditambahkan.`);
    reset();
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-9 rounded-[var(--radius-control)] bg-[var(--action-primary-bg)] px-3.5 text-[13px] font-semibold text-[var(--text-on-brand)] hover:bg-[var(--action-primary-bg-hover)]"
      >
        + Catat stok masuk
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] p-4"
    >
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <select
          value={productId}
          onChange={(e) => {
            setProductId(e.target.value);
            setGrade("");
            setSaleUnitId("");
          }}
          required
          className={inputClass}
        >
          <option value="">Pilih produk…</option>
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.nama}
            </option>
          ))}
        </select>

        {isMelon && (
          <select
            value={grade}
            onChange={(e) => {
              setGrade(e.target.value as IntakeGradeKode);
              setSaleUnitId("");
            }}
            required
            className={inputClass}
          >
            <option value="">Pilih grade panen…</option>
            {INTAKE_GRADES.map((g) => (
              <option key={g.kode} value={g.kode}>
                {g.label}
              </option>
            ))}
          </select>
        )}

        {needsSize && (
          <select value={saleUnitId} onChange={(e) => setSaleUnitId(e.target.value)} required className={inputClass}>
            <option value="">Pilih size…</option>
            {selectedProduct!.sizeUnits.map((u) => (
              <option key={u.id} value={u.id}>
                Size {u.ukuran}
              </option>
            ))}
          </select>
        )}

        {flatTargets.length > 0 && (
          <select value={saleUnitId} onChange={(e) => setSaleUnitId(e.target.value)} className={inputClass}>
            <option value="">Masuk stok agregat produk (tanpa satuan spesifik)</option>
            {flatTargets.map((u) => (
              <option key={u.id} value={u.id}>
                {u.satuan}
              </option>
            ))}
          </select>
        )}

        <input
          type="number"
          step="0.01"
          min={0}
          value={jumlah}
          onChange={(e) => setJumlah(e.target.value)}
          placeholder={needsSize ? "Jumlah (kg)" : "Jumlah"}
          required
          className={inputClass}
        />
        <input type="date" value={tanggalMasuk} onChange={(e) => setTanggalMasuk(e.target.value)} required className={inputClass} />
        <input
          type="date"
          value={bestBefore}
          onChange={(e) => setBestBefore(e.target.value)}
          placeholder="Best before (opsional)"
          className={inputClass}
        />
        <input
          value={lokasiSimpan}
          onChange={(e) => setLokasiSimpan(e.target.value)}
          placeholder="Lokasi simpan (opsional)"
          className={inputClass}
        />
        <input
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          placeholder="Catatan (opsional)"
          className={`${inputClass} sm:col-span-2 lg:col-span-2`}
        />
      </div>
      {error && <p className="text-[13px] font-medium text-[var(--status-danger-fg)]">{error}</p>}
      {success && <p className="text-[13px] font-medium text-[var(--status-success-fg)]">{success}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="h-9 rounded-[var(--radius-control)] bg-[var(--action-primary-bg)] px-3.5 text-[13px] font-semibold text-[var(--text-on-brand)] hover:bg-[var(--action-primary-bg-hover)] disabled:opacity-60"
        >
          {loading ? "Menyimpan…" : "Simpan stok masuk"}
        </button>
        <button
          type="button"
          onClick={() => {
            setOpen(false);
            setError(null);
          }}
          className="h-9 rounded-[var(--radius-control)] border border-[var(--border-default)] px-3.5 text-[13px] text-[var(--text-body)]"
        >
          Tutup
        </button>
      </div>
    </form>
  );
}
