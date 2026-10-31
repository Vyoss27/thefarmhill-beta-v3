"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function LupaPasswordPage() {
  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });

    setLoading(false);
    if (resetError) {
      setError(resetError.message);
      return;
    }
    setSent(true);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <Image src="/logo-farmhill-store.png" alt="Farmhill Store" width={174} height={58} priority className="mb-8 h-[52px] w-auto self-start" />

      {sent ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] p-6 text-center shadow-[var(--shadow-xs)]">
          <p className="text-[17px] font-semibold text-[var(--text-heading)]">Link reset terkirim</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
            Cek email <strong className="text-[var(--text-body)]">{email}</strong> untuk link reset password. Kalau
            nggak muncul, cek folder spam.
          </p>
          <Link href="/login" className="mt-4 inline-block text-sm font-semibold text-[var(--text-link)] hover:text-[var(--text-link-hover)]">
            ← Kembali ke login
          </Link>
        </div>
      ) : (
        <>
          <h1 className="font-serif text-[28px] font-semibold tracking-[-0.01em] text-[var(--text-heading)]">
            Lupa password
          </h1>
          <p className="mt-2 text-[15px] leading-snug text-[var(--text-muted)]">
            Masukkan email akunmu, kami kirim link buat bikin password baru.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-6 flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-xs)]"
          >
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-[var(--text-body)]" htmlFor="email">
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-10 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 text-sm text-[var(--text-body)] outline-none transition-[border-color,box-shadow] focus:border-[var(--border-focus)] focus:shadow-[var(--shadow-focus)]"
              />
            </div>

            {error && (
              <p className="rounded-[var(--radius-control)] bg-[var(--status-danger-bg)] px-3 py-2 text-sm text-[var(--status-danger-fg)]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={loading}
              className="h-[42px] rounded-[var(--radius-control)] bg-[var(--action-primary-bg)] text-sm font-semibold text-[var(--text-on-brand)] transition-colors hover:bg-[var(--action-primary-bg-hover)] disabled:opacity-60"
            >
              {loading ? "Mengirim…" : "Kirim link reset"}
            </button>

            <Link href="/login" className="text-center text-sm text-[var(--text-muted)] hover:text-[var(--text-link)]">
              ← Kembali ke login
            </Link>
          </form>
        </>
      )}
    </div>
  );
}
