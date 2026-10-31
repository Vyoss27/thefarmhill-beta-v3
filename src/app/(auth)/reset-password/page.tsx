"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import PasswordInput from "@/components/PasswordInput";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }
    setLoading(true);

    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({ password });

    setLoading(false);
    if (updateError) {
      setError("Link reset sudah kedaluwarsa — minta link baru lewat halaman lupa password.");
      return;
    }
    setDone(true);
    setTimeout(() => router.push("/login"), 2000);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <Image src="/logo-farmhill-store.png" alt="Farmhill Store" width={174} height={58} priority className="mb-8 h-[52px] w-auto self-start" />

      {done ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] p-6 text-center shadow-[var(--shadow-xs)]">
          <p className="text-[17px] font-semibold text-[var(--text-heading)]">Password berhasil diubah</p>
          <p className="mt-2 text-sm text-[var(--text-muted)]">Mengalihkan ke halaman login…</p>
        </div>
      ) : (
        <>
          <h1 className="font-serif text-[28px] font-semibold tracking-[-0.01em] text-[var(--text-heading)]">
            Buat password baru
          </h1>

          <form
            onSubmit={handleSubmit}
            className="mt-6 flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-xs)]"
          >
            <div className="flex flex-col gap-1.5">
              <label className="text-[13px] font-semibold text-[var(--text-body)]" htmlFor="password">
                Password baru
              </label>
              <PasswordInput id="password" value={password} onChange={setPassword} required minLength={6} autoComplete="new-password" />
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
              {loading ? "Menyimpan…" : "Simpan password baru"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
