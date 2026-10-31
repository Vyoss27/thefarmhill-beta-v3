"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { addStaff } from "@/lib/actions/manage-staff";

export default function AddStaffForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"admin" | "sales">("sales");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const result = await addStaff({ nama, email, role });
    setLoading(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setSuccess(true);
    setNama("");
    setEmail("");
    setRole("sales");
    router.refresh();
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="h-9 rounded-[var(--radius-control)] bg-[var(--action-primary-bg)] px-3.5 text-[13px] font-semibold text-[var(--text-on-brand)] hover:bg-[var(--action-primary-bg-hover)]"
      >
        + Undang staf baru
      </button>
    );
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex flex-col gap-3 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] p-4"
    >
      {success && (
        <p className="rounded-[var(--radius-control)] bg-[var(--status-success-bg)] px-3 py-2 text-[13px] text-[var(--status-success-fg)]">
          Undangan terkirim ke email staf — mereka set password sendiri lewat email itu.
        </p>
      )}
      <div className="grid gap-3 sm:grid-cols-3">
        <input
          value={nama}
          onChange={(e) => setNama(e.target.value)}
          placeholder="Nama"
          required
          className="h-10 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 text-sm outline-none focus:border-[var(--border-focus)]"
        />
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          required
          className="h-10 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 text-sm outline-none focus:border-[var(--border-focus)]"
        />
        <select
          value={role}
          onChange={(e) => setRole(e.target.value as "admin" | "sales")}
          className="h-10 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 text-sm outline-none focus:border-[var(--border-focus)]"
        >
          <option value="sales">Sales</option>
          <option value="admin">Admin</option>
        </select>
      </div>
      {error && <p className="text-[13px] font-medium text-[var(--status-danger-fg)]">{error}</p>}
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={loading}
          className="h-9 rounded-[var(--radius-control)] bg-[var(--action-primary-bg)] px-3.5 text-[13px] font-semibold text-[var(--text-on-brand)] hover:bg-[var(--action-primary-bg-hover)] disabled:opacity-60"
        >
          {loading ? "Mengundang…" : "Kirim undangan"}
        </button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="h-9 rounded-[var(--radius-control)] border border-[var(--border-default)] px-3.5 text-[13px] text-[var(--text-body)]"
        >
          Batal
        </button>
      </div>
    </form>
  );
}
