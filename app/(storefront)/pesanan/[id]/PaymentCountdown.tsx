"use client";

import { useEffect, useState } from "react";

function format(ms: number) {
  const totalSeconds = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

/** Countdown hidup ke batasBayar (BR-04, 1 hari) — server tetap sumber kebenaran status. */
export default function PaymentCountdown({ batasBayar }: { batasBayar: string }) {
  const target = new Date(batasBayar).getTime();
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    setNow(Date.now());
    const interval = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  if (now === null) return null;

  const remaining = target - now;
  const habis = remaining <= 0;

  return (
    <div
      className={`fh-numeric mt-1.5 inline-flex items-center gap-1.5 rounded-[var(--radius-control)] px-2.5 py-1.5 text-[14px] font-bold ${
        habis ? "bg-[var(--status-danger-bg)] text-[var(--status-danger-fg)]" : "bg-[var(--status-accent-bg)] text-[var(--status-accent-fg)]"
      }`}
    >
      {habis ? "Batas bayar terlewat — pesanan akan otomatis kedaluwarsa" : `Sisa waktu bayar: ${format(remaining)}`}
    </div>
  );
}
