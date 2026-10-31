"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { prepareCustomerSignUp } from "@/lib/actions/customer-account";
import PasswordInput from "@/components/PasswordInput";

export default function DaftarPage() {
  const [nama, setNama] = useState("");
  const [wa, setWa] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password.length < 6) {
      setError("Password minimal 6 karakter.");
      return;
    }
    setLoading(true);

    const prep = await prepareCustomerSignUp({ nama, wa, email });
    if (!prep.ok) {
      setLoading(false);
      setError(prep.error);
      return;
    }

    const supabase = createClient();
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
      options: { emailRedirectTo: `${window.location.origin}/login` },
    });

    setLoading(false);
    if (signUpError) {
      setError(signUpError.message.includes("already registered") ? "Email ini sudah terdaftar." : signUpError.message);
      return;
    }
    setSuccess(true);
  }

  return (
    <div className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-6 py-12">
      <Image src="/logo-farmhill-store.png" alt="Farmhill Store" width={174} height={58} priority className="mb-8 h-[52px] w-auto self-start" />

      {success ? (
        <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] p-6 text-center shadow-[var(--shadow-xs)]">
          <p className="text-[17px] font-semibold text-[var(--text-heading)]">Cek email kamu</p>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
            Kami sudah kirim link konfirmasi ke <strong className="text-[var(--text-body)]">{email}</strong>. Klik link
            itu buat mengaktifkan akun, lalu masuk lewat halaman login.
          </p>
          <Link href="/login" className="mt-4 inline-block text-sm font-semibold text-[var(--text-link)] hover:text-[var(--text-link-hover)]">
            Ke halaman login →
          </Link>
        </div>
      ) : (
        <>
          <h1 className="font-serif text-[28px] font-semibold tracking-[-0.01em] text-[var(--text-heading)]">
            Daftar akun
          </h1>
          <p className="mt-2 text-[15px] leading-snug text-[var(--text-muted)]">
            Opsional — checkout tetap bisa tanpa akun. Daftar kalau mau lihat riwayat pesanan lebih gampang.
          </p>

          <form
            onSubmit={handleSubmit}
            className="mt-6 flex flex-col gap-4 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] p-5 shadow-[var(--shadow-xs)]"
          >
            <Field label="Nama" htmlFor="nama">
              <input id="nama" required value={nama} onChange={(e) => setNama(e.target.value)} className={inputClass} />
            </Field>
            <Field label="Nomor WhatsApp" htmlFor="wa">
              <input
                id="wa"
                required
                value={wa}
                onChange={(e) => setWa(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className={inputClass}
              />
            </Field>
            <Field label="Email" htmlFor="email">
              <input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className={inputClass} />
              <p className="text-xs text-[var(--text-muted)]">Dipakai buat login &amp; reset password kalau lupa.</p>
            </Field>
            <Field label="Password" htmlFor="password">
              <PasswordInput id="password" value={password} onChange={setPassword} required minLength={6} autoComplete="new-password" />
            </Field>

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
              {loading ? "Mendaftar…" : "Daftar"}
            </button>

            <p className="text-center text-sm text-[var(--text-muted)]">
              Sudah punya akun?{" "}
              <Link href="/login" className="font-semibold text-[var(--text-link)] hover:text-[var(--text-link-hover)]">
                Masuk
              </Link>
            </p>
          </form>
        </>
      )}
    </div>
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
