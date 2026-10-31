import { MessageCircle } from "lucide-react";
import { getSupportWaHref } from "@/lib/support-contact";

/**
 * Fallback kalau ada link lama yang nunjuk kesini — bottom nav "Chat CS"
 * sekarang buka WA langsung (lihat CustomerBottomTabBar via layout.tsx),
 * gak lewat halaman ini lagi. Belum diputuskan chat in-app (Supabase
 * Realtime) — untuk sekarang WA tetap satu-satunya jalur nyata.
 */
export default function ChatPage() {
  const waHref = getSupportWaHref();

  return (
    <div className="mx-auto flex max-w-sm flex-col items-center py-16 text-center">
      <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface-brand-soft)] text-[var(--text-brand)]">
        <MessageCircle size={26} strokeWidth={1.75} />
      </div>
      <h1 className="mt-4 font-serif text-2xl font-semibold text-[var(--text-heading)]">Chat sales</h1>
      {waHref ? (
        <>
          <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
            Ada pertanyaan soal produk atau pesanan? Chat langsung ke sales Farmhill Store lewat WhatsApp.
          </p>
          <a
            href={waHref}
            target="_blank"
            rel="noreferrer"
            className="mt-5 flex h-11 w-full items-center justify-center rounded-[var(--radius-control)] bg-[var(--action-primary-bg)] text-sm font-semibold text-[var(--text-on-brand)] hover:bg-[var(--action-primary-bg-hover)]"
          >
            Buka WhatsApp
          </a>
        </>
      ) : (
        <p className="mt-2 text-sm leading-relaxed text-[var(--text-muted)]">
          Fitur chat belum tersedia. Sales akan menghubungi kamu lewat WhatsApp setelah pesanan dikonfirmasi.
        </p>
      )}
    </div>
  );
}
