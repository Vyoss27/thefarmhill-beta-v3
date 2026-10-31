"use client";

import { useState } from "react";
import { updateCustomerProfile } from "@/lib/actions/customer-account";

type Customer = { id: string; nama: string; wa: string; alamat: string };

export default function AkunForm({ customer }: { customer: Customer }) {
  const [nama, setNama] = useState(customer.nama);
  const [wa, setWa] = useState(customer.wa);
  const [alamat, setAlamat] = useState(customer.alamat);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);
    const result = await updateCustomerProfile({ customerId: customer.id, nama, wa, alamat });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess(true);
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="mt-5 flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-xs)]"
    >
      <Field label="Nama" htmlFor="nama">
        <input id="nama" required value={nama} onChange={(e) => setNama(e.target.value)} className={inputClass} />
      </Field>
      <Field label="Nomor WhatsApp" htmlFor="wa">
        <input id="wa" required value={wa} onChange={(e) => setWa(e.target.value)} placeholder="08xxxxxxxxxx" className={inputClass} />
      </Field>
      <Field label="Alamat pengiriman" htmlFor="alamat">
        <textarea
          id="alamat"
          rows={3}
          value={alamat}
          onChange={(e) => setAlamat(e.target.value)}
          placeholder="Nama jalan, no. rumah, RT/RW, kelurahan, kecamatan"
          className={`${inputClass} h-auto resize-none py-2`}
        />
      </Field>

      {error && (
        <p className="rounded-[var(--radius-control)] bg-[var(--status-danger-bg)] px-3 py-2 text-sm text-[var(--status-danger-fg)]">
          {error}
        </p>
      )}
      {success && (
        <p className="rounded-[var(--radius-control)] bg-[var(--status-success-bg)] px-3 py-2 text-sm text-[var(--status-success-fg)]">
          Data tersimpan.
        </p>
      )}

      <button
        type="submit"
        disabled={loading}
        className="h-[42px] rounded-[var(--radius-control)] bg-[var(--action-primary-bg)] text-sm font-semibold text-[var(--text-on-brand)] transition-colors hover:bg-[var(--action-primary-bg-hover)] disabled:opacity-60"
      >
        {loading ? "Menyimpan…" : "Simpan perubahan"}
      </button>
    </form>
  );
}

const inputClass =
  "h-10 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 text-sm text-[var(--text-body)] outline-none transition-[border-color,box-shadow] focus:border-[var(--border-focus)] focus:shadow-[var(--shadow-focus)]";

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-semibold text-[var(--text-body)]" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}
