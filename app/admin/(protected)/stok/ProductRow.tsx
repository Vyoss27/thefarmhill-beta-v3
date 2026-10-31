"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateSaleUnit, updateProductStatus } from "@/lib/actions/manage-product";
import { CATEGORY_LABEL, formatRupiah } from "@/lib/catalog";
import { melonSizeRangeLabel } from "@/lib/melon-size";
import { melonGradeLabel } from "@/lib/melon-grade";

const STATUS_BADGE: Record<string, { bg: string; fg: string }> = {
  aktif: { bg: "var(--status-success-bg)", fg: "var(--status-success-fg)" },
  draft: { bg: "var(--status-neutral-bg)", fg: "var(--status-neutral-fg)" },
  habis: { bg: "var(--status-accent-bg)", fg: "var(--status-accent-fg)" },
};

type SaleUnit = {
  id: string;
  satuan: string;
  grade: string | null;
  ukuran: string | null;
  stokUnitId?: string | null;
  harga: string;
  minOrder: number;
  stock: { jumlah: string; ditahan: string } | null;
};

type Product = {
  id: string;
  nama: string;
  jenisItem: string;
  status: string;
  ambangStokTipis: string | null;
  stock: { jumlah: string; ditahan: string } | null;
  saleUnits: SaleUnit[];
};

export default function ProductRow({ product, zebra }: { product: Product; zebra: boolean }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sizeUnits = product.saleUnits.filter((u) => u.ukuran);
  const hasSizes = sizeUnits.length > 0;
  // Unit "Grade Perfect" tanpa ukuran hanya dipertahankan untuk riwayat order lama —
  // begitu varian ukuran sudah ada, unit lama itu tidak lagi dipakai untuk pesanan baru.
  const flatUnits = product.saleUnits.filter((u) => !u.ukuran && !(hasSizes && u.grade === "perfect"));

  const [units, setUnits] = useState(flatUnits.map((u) => ({ ...u, hargaInput: String(Number(u.harga)) })));
  const [sizeInputs, setSizeInputs] = useState(sizeUnits.map((u) => ({ ...u, hargaInput: String(Number(u.harga)) })));
  const [status, setStatus] = useState(product.status);

  // Stok melon per KOLAM, bukan per tingkat size: tingkat harga Perfect (Standar/+8rb/+16rb) berbagi
  // satu kolam stok (unit Perfect tanpa size), Imperfect punya kolam sendiri.
  const stokOf = (u: SaleUnit | undefined) => Number(u?.stock?.jumlah ?? 0) - Number(u?.stock?.ditahan ?? 0);
  const stokChips: { key: string; label: string; title?: string; tersedia: number; habis: boolean }[] = [];
  const perfectKolam = product.saleUnits.find((u) => u.grade === "perfect" && !u.ukuran);
  if (sizeUnits.every((u) => u.stokUnitId) && perfectKolam) {
    stokChips.push({ key: "perfect", label: "Perfect", title: "Satu kolam stok untuk semua tingkat ukuran", tersedia: stokOf(perfectKolam), habis: stokOf(perfectKolam) <= 0 });
  } else {
    for (const u of sizeUnits) {
      stokChips.push({ key: u.id, label: u.ukuran!, title: melonSizeRangeLabel(u.ukuran!) ?? undefined, tersedia: stokOf(u), habis: stokOf(u) <= 0 });
    }
  }
  for (const u of product.saleUnits.filter((x) => x.grade === "imperfect" && !x.ukuran)) {
    stokChips.push({ key: u.id, label: "Imperfect", tersedia: stokOf(u), habis: stokOf(u) <= 0 });
  }

  const jumlah = Number(product.stock?.jumlah ?? 0);
  const ditahan = Number(product.stock?.ditahan ?? 0);
  const tersedia = jumlah - ditahan;
  const ambang = product.ambangStokTipis ? Number(product.ambangStokTipis) : null;
  const kritis = ambang !== null && jumlah <= ambang;
  const badge = STATUS_BADGE[status] ?? STATUS_BADGE.draft;

  async function handleSave() {
    setSaving(true);
    setError(null);
    for (const u of units) {
      const result = await updateSaleUnit({ saleUnitId: u.id, satuan: u.satuan, harga: Number(u.hargaInput), minOrder: u.minOrder });
      if (!result.ok) {
        setError(result.error);
        setSaving(false);
        return;
      }
    }
    for (const u of sizeInputs) {
      const priceChanged = Number(u.hargaInput) !== Number(u.harga);
      if (priceChanged) {
        const result = await updateSaleUnit({ saleUnitId: u.id, satuan: u.satuan, harga: Number(u.hargaInput), minOrder: u.minOrder });
        if (!result.ok) {
          setError(result.error);
          setSaving(false);
          return;
        }
      }
    }
    if (status !== product.status) {
      const result = await updateProductStatus({ productId: product.id, status: status as "aktif" | "draft" | "habis" });
      if (!result.ok) {
        setError(result.error);
        setSaving(false);
        return;
      }
    }
    setSaving(false);
    setEditing(false);
    router.refresh();
  }

  const rowClass = `border-b border-[var(--border-subtle)] last:border-0 align-top ${zebra ? "bg-[var(--surface-sunken)]/40" : ""}`;

  if (!editing) {
    return (
      <tr className={rowClass}>
        <td className="px-5 py-2.5 font-medium text-[var(--text-heading)]">{product.nama}</td>
        <td className="px-3 py-2.5 text-[var(--text-body)]">{CATEGORY_LABEL[product.jenisItem] ?? product.jenisItem}</td>
        <td className="px-3 py-2.5 text-[var(--text-body)]">
          {flatUnits.map((u) => (
            <div key={u.id} className="fh-numeric whitespace-nowrap">
              {formatRupiah(Number(u.harga))}
              <span className="text-[var(--text-subtle)]"> /{u.satuan}{u.grade ? ` (${melonGradeLabel(u.grade)})` : ""}</span>
            </div>
          ))}
          {hasSizes && (
            <div className="mt-1.5 flex flex-wrap gap-1">
              {stokChips.map((c) => (
                <span
                  key={c.key}
                  title={c.title}
                  className={`rounded-[var(--radius-badge)] px-1.5 py-0.5 text-[10.5px] font-semibold ${
                    c.habis
                      ? "bg-[var(--surface-disabled)] text-[var(--text-disabled)]"
                      : "bg-[var(--status-success-bg)] text-[var(--status-success-fg)]"
                  }`}
                >
                  {c.label} {c.habis ? "habis" : `${c.tersedia}kg`}
                </span>
              ))}
            </div>
          )}
        </td>
        <td className={`fh-numeric px-3 py-2.5 text-right ${kritis ? "font-semibold text-[var(--status-danger-fg)]" : "text-[var(--text-body)]"}`}>
          {jumlah}
        </td>
        <td className="fh-numeric px-3 py-2.5 text-right text-[var(--text-body)]">{ditahan}</td>
        <td className="fh-numeric px-3 py-2.5 text-right font-semibold text-[var(--text-heading)]">{tersedia}</td>
        <td className="px-5 py-2.5">
          <span className="rounded-[var(--radius-badge)] px-2 py-1 text-[11px] font-semibold capitalize" style={{ background: badge.bg, color: badge.fg }}>
            {status}
          </span>
        </td>
        <td className="px-3 py-2.5 text-right">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-[var(--radius-control)] border border-[var(--border-default)] px-2.5 py-1 text-[12px] font-medium text-[var(--text-body)] hover:bg-[var(--surface-hover)]"
          >
            Edit
          </button>
        </td>
      </tr>
    );
  }

  return (
    <tr className={rowClass}>
      <td className="px-5 py-2.5 font-medium text-[var(--text-heading)]">{product.nama}</td>
      <td className="px-3 py-2.5 text-[var(--text-body)]">{CATEGORY_LABEL[product.jenisItem] ?? product.jenisItem}</td>
      <td className="px-3 py-2.5">
        <div className="flex flex-col gap-1.5">
          {units.map((u, idx) => (
            <div key={u.id} className="flex items-center gap-1.5">
              <input
                value={u.satuan}
                onChange={(e) => setUnits((prev) => prev.map((x, i) => (i === idx ? { ...x, satuan: e.target.value } : x)))}
                className="h-8 w-16 rounded-[var(--radius-control)] border border-[var(--border-default)] px-1.5 text-xs"
              />
              <input
                type="number"
                min={0}
                value={u.hargaInput}
                onChange={(e) => setUnits((prev) => prev.map((x, i) => (i === idx ? { ...x, hargaInput: e.target.value } : x)))}
                className="h-8 w-24 rounded-[var(--radius-control)] border border-[var(--border-default)] px-1.5 text-xs"
              />
            </div>
          ))}
        </div>
        {sizeInputs.length > 0 && (
          <div className="mt-2 flex flex-col gap-1 border-t border-[var(--border-subtle)] pt-2">
            <p className="text-[10.5px] font-semibold uppercase text-[var(--text-subtle)]">
              Ukuran (Grade Perfect) — harga/kg. Stok cuma bisa diubah lewat "Catat stok masuk" / "Catat stok keluar".
            </p>
            {sizeInputs.map((u, idx) => (
              <div key={u.id} className="flex items-center gap-1.5">
                <span className="w-7 fh-numeric text-[11px] font-semibold text-[var(--text-body)]">{u.ukuran}</span>
                <input
                  type="number"
                  min={0}
                  value={u.hargaInput}
                  onChange={(e) => setSizeInputs((prev) => prev.map((x, i) => (i === idx ? { ...x, hargaInput: e.target.value } : x)))}
                  className="h-8 w-24 rounded-[var(--radius-control)] border border-[var(--border-default)] px-1.5 text-xs"
                  placeholder="Harga/kg"
                />
              </div>
            ))}
          </div>
        )}
      </td>
      <td className="fh-numeric px-3 py-2.5 text-right text-[var(--text-body)]">{jumlah}</td>
      <td className="fh-numeric px-3 py-2.5 text-right text-[var(--text-body)]">{ditahan}</td>
      <td className="fh-numeric px-3 py-2.5 text-right font-semibold text-[var(--text-heading)]">{tersedia}</td>
      <td className="px-5 py-2.5">
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-8 rounded-[var(--radius-control)] border border-[var(--border-default)] px-1.5 text-xs capitalize"
        >
          <option value="draft">draft</option>
          <option value="aktif">aktif</option>
          <option value="habis">habis</option>
        </select>
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
              setError(null);
              setUnits(flatUnits.map((u) => ({ ...u, hargaInput: String(Number(u.harga)) })));
              setSizeInputs(sizeUnits.map((u) => ({ ...u, hargaInput: String(Number(u.harga)) })));
              setStatus(product.status);
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
