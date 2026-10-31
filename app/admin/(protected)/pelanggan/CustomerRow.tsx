"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateCustomer } from "@/lib/actions/manage-customer";
import { formatRupiah } from "@/lib/catalog";

const SEGMENT_LABEL: Record<string, string> = {
  rumah_tangga: "Rumah tangga",
  kafe: "Kafe / juice bar",
  reseller: "Reseller",
};

const inputClass =
  "h-8 w-full rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-card)] px-2 text-xs outline-none focus:border-[var(--border-focus)]";

type Customer = {
  id: string;
  nama: string;
  wa: string;
  email: string | null;
  alamat: string | null;
  segmen: string | null;
};

export default function CustomerRow({
  customer,
  jumlahPesanan,
  totalBelanja,
  zebra,
}: {
  customer: Customer;
  jumlahPesanan: number;
  totalBelanja: number;
  zebra: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [nama, setNama] = useState(customer.nama);
  const [wa, setWa] = useState(customer.wa);
  const [email, setEmail] = useState(customer.email ?? "");
  const [alamat, setAlamat] = useState(customer.alamat ?? "");
  const [segmen, setSegmen] = useState(customer.segmen ?? "");

  function resetFields() {
    setNama(customer.nama);
    setWa(customer.wa);
    setEmail(customer.email ?? "");
    setAlamat(customer.alamat ?? "");
    setSegmen(customer.segmen ?? "");
    setError(null);
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    const result = await updateCustomer({
      customerId: customer.id,
      nama,
      wa,
      email: email || undefined,
      alamat: alamat || undefined,
      segmen: (segmen || undefined) as "rumah_tangga" | "kafe" | "reseller" | undefined,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setEditing(false);
    router.refresh();
  }

  const rowClass = `border-b border-[var(--border-subtle)] last:border-0 align-top ${zebra ? "bg-[var(--surface-sunken)]/40" : ""}`;

  if (!editing) {
    return (
      <tr className={rowClass}>
        <td className="px-5 py-2.5 font-medium text-[var(--text-heading)]">{customer.nama}</td>
        <td className="fh-numeric px-3 py-2.5 text-[var(--text-body)]">{customer.wa}</td>
        <td className="px-3 py-2.5 text-[var(--text-body)]">{customer.segmen ? SEGMENT_LABEL[customer.segmen] : "—"}</td>
        <td className="fh-numeric px-3 py-2.5 text-right text-[var(--text-body)]">{jumlahPesanan}</td>
        <td className="fh-numeric px-3 py-2.5 text-right font-semibold text-[var(--text-heading)]">{formatRupiah(totalBelanja)}</td>
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
      <td className="px-5 py-2.5">
        <div className="flex flex-col gap-1.5">
          <input value={nama} onChange={(e) => setNama(e.target.value)} placeholder="Nama" className={inputClass} />
          <input value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email (opsional)" className={inputClass} />
          <textarea
            value={alamat}
            onChange={(e) => setAlamat(e.target.value)}
            placeholder="Alamat"
            rows={2}
            className={`${inputClass} h-auto resize-none py-1.5`}
          />
        </div>
      </td>
      <td className="px-3 py-2.5">
        <input value={wa} onChange={(e) => setWa(e.target.value)} placeholder="08xxxxxxxxxx" className={`${inputClass} fh-numeric w-28`} />
      </td>
      <td className="px-3 py-2.5">
        <select value={segmen} onChange={(e) => setSegmen(e.target.value)} className={inputClass}>
          <option value="">—</option>
          <option value="rumah_tangga">Rumah tangga</option>
          <option value="kafe">Kafe / juice bar</option>
          <option value="reseller">Reseller</option>
        </select>
      </td>
      <td className="fh-numeric px-3 py-2.5 text-right text-[var(--text-body)]">{jumlahPesanan}</td>
      <td className="fh-numeric px-3 py-2.5 text-right font-semibold text-[var(--text-heading)]">{formatRupiah(totalBelanja)}</td>
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
