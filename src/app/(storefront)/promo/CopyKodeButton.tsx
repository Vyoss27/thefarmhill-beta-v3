"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";

export default function CopyKodeButton({ kode }: { kode: string }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(kode);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard API gak tersedia — abaikan, tombol tetap nampilin kode buat disalin manual.
    }
  }

  return (
    <button
      type="button"
      onClick={handleCopy}
      className="flex h-9 items-center gap-1.5 rounded-[var(--radius-control)] border border-dashed border-[var(--border-strong)] px-3 text-[13px] font-semibold text-[var(--text-brand)]"
    >
      {copied ? <Check size={14} strokeWidth={2.25} /> : <Copy size={14} strokeWidth={2} />}
      {kode}
    </button>
  );
}
