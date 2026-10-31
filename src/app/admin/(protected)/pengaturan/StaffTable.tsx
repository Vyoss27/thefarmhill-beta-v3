"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toggleStaffActive } from "@/lib/actions/manage-staff";

type Staff = { id: string; nama: string; kontak: string; role: string; aktif: boolean };

export default function StaffTable({ staffList, currentUserId }: { staffList: Staff[]; currentUserId: string }) {
  const router = useRouter();
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function handleToggle(userId: string, nextAktif: boolean) {
    setLoadingId(userId);
    setError(null);
    const result = await toggleStaffActive({ userId, aktif: nextAktif });
    setLoadingId(null);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    router.refresh();
  }

  return (
    <div>
      {error && (
        <p className="mb-3 rounded-[var(--radius-control)] bg-[var(--status-danger-bg)] px-3 py-2 text-sm text-[var(--status-danger-fg)]">
          {error}
        </p>
      )}
      <div className="overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)]">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border-default)] bg-[var(--surface-sunken)] text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
              <th className="px-5 py-2.5 font-semibold">Nama</th>
              <th className="px-3 py-2.5 font-semibold">Email</th>
              <th className="px-3 py-2.5 font-semibold">Role</th>
              <th className="px-3 py-2.5 font-semibold">Status</th>
              <th className="px-5 py-2.5 text-right font-semibold" />
            </tr>
          </thead>
          <tbody>
            {staffList.map((s, idx) => (
              <tr key={s.id} className={`border-b border-[var(--border-subtle)] last:border-0 ${idx % 2 === 1 ? "bg-[var(--surface-sunken)]/40" : ""}`}>
                <td className="px-5 py-2.5 font-medium text-[var(--text-heading)]">
                  {s.nama} {s.id === currentUserId && <span className="text-[12px] text-[var(--text-muted)]">(kamu)</span>}
                </td>
                <td className="px-3 py-2.5 text-[var(--text-body)]">{s.kontak}</td>
                <td className="px-3 py-2.5 capitalize text-[var(--text-body)]">{s.role}</td>
                <td className="px-3 py-2.5">
                  <span
                    className="rounded-[var(--radius-badge)] px-2 py-1 text-[11px] font-semibold"
                    style={
                      s.aktif
                        ? { background: "var(--status-success-bg)", color: "var(--status-success-fg)" }
                        : { background: "var(--status-neutral-bg)", color: "var(--status-neutral-fg)" }
                    }
                  >
                    {s.aktif ? "Aktif" : "Nonaktif"}
                  </span>
                </td>
                <td className="px-5 py-2.5 text-right">
                  <button
                    type="button"
                    onClick={() => handleToggle(s.id, !s.aktif)}
                    disabled={loadingId === s.id || (s.id === currentUserId && s.aktif)}
                    className="text-[13px] font-semibold text-[var(--text-link)] hover:text-[var(--text-link-hover)] disabled:cursor-not-allowed disabled:text-[var(--text-disabled)]"
                  >
                    {loadingId === s.id ? "Memproses…" : s.aktif ? "Nonaktifkan" : "Aktifkan"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
