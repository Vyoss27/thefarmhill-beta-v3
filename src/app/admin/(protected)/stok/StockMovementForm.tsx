"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { recordStockMovement } from "@/lib/actions/manage-stock-movement";

type ProductOption = {
  id: string;
  nama: string;
  sizeUnits: { id: string; ukuran: string }[];
  flatUnits: { id: string; satuan: string; grade: string | null }[];
};

const JENIS_OPTIONS = [
  { value: "waste_kulit", label: "Waste kulit" },
  { value: "waste_busuk", label: "Waste tidak manis" },
  { value: "waste_reject", label: "Waste reject" },
  { value: "penyesuaian", label: "Penyesuaian opname" },
] as const;

const inputClass =
  "h-10 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 text-sm outline-none focus:border-[var(--border-focus)]";

export default function StockMovementForm({ products }: { products: ProductOption[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [productId, setProductId] = useState("");
  const [saleUnitId, setSaleUnitId] = useState("");
  const [jenis, setJenis] = useState<(typeof JENIS_OPTIONS)[number]["value"]>("waste_kulit");
  const [arah, setArah] = useState<"kurang" | "tambah">("kurang");
  const [jumlah, setJumlah] = useState("");
  const [catatan, setCatatan] = useState("");

  const selectedProduct = useMemo(() => products.find((p) => p.id === productId), [products, productId]);
  const targets = selectedProduct ? [...selectedProduct.sizeUnits.map((u) => ({ id: u.id, label: `Size ${u.ukuran}` })), ...selectedProduct.flatUnits.map((u) => ({ id: u.id, label: u.satuan }))] : [];
  const isPenyesuaian = jenis === "penyesuaian";

  function reset() {
    setProductId("");
    setSaleUnitId("");
    setJenis("waste_kulit");
    setArah("kurang");
    setJumlah("");
    setCatatan("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);
    const result = await recordStockMovement({
      productId,
      saleUnitId: saleUnitId || undefined,
      jenis,
      arah: isPenyesuaian ? arah : "kurang",
      jumlah: Number(jumlah),
      catatan,
    });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess("Stok keluar/penyesuaian tercatat.");
    reset();
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-9 rounded-[var(--radius-control)] border border-[var(--border-default)] px-3.5 text-[13px] font-semibold text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
      >
        + Catat stok keluar / penyesuaian
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

        {targets.length > 0 && (
          <select value={saleUnitId} onChange={(e) => setSaleUnitId(e.target.value)} className={inputClass}>
            <option value="">Stok agregat produk (tanpa satuan spesifik)</option>
            {targets.map((t) => (
              <option key={t.id} value={t.id}>
                {t.label}
              </option>
            ))}
          </select>
        )}

        <select value={jenis} onChange={(e) => setJenis(e.target.value as typeof jenis)} required className={inputClass}>
          {JENIS_OPTIONS.map((j) => (
            <option key={j.value} value={j.value}>
              {j.label}
            </option>
          ))}
        </select>

        {isPenyesuaian && (
          <select value={arah} onChange={(e) => setArah(e.target.value as typeof arah)} className={inputClass}>
            <option value="kurang">Koreksi kurang (fisik &lt; catatan)</option>
            <option value="tambah">Koreksi tambah (fisik &gt; catatan)</option>
          </select>
        )}

        <input
          type="number"
          step="0.01"
          min={0}
          value={jumlah}
          onChange={(e) => setJumlah(e.target.value)}
          placeholder="Jumlah (kg)"
          required
          className={inputClass}
        />
        <input
          value={catatan}
          onChange={(e) => setCatatan(e.target.value)}
          placeholder="Alasan/catatan (wajib)"
          required
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
          {loading ? "Menyimpan…" : "Simpan"}
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
