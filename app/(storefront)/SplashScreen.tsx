"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";

const SESSION_KEY = "farmhill_splash_shown";
const MIN_DISPLAY_MS = 1200;
const EXIT_MS = 260;

// Spec: "Versi <major>.<bulan>.<tahun 2 digit>" — datang dari build config,
// bukan dihitung dari tanggal saat ini (itu "kapan dilihat", bukan "versi apa").
const VERSION_LABEL = process.env.NEXT_PUBLIC_APP_VERSION ?? "Versi 1.9.26";

// `transform: translateZ(0)` sengaja dipasang di tiap daun — tanpa itu, border-radius
// asimetris (mis. "0 76% 0 76%") pada elemen absolute sebesar ini bikin sibling
// <Image> di bawahnya gagal ter-paint di sebagian environment (browser compositing
// quirk), walau markup & computed style-nya sendiri sudah benar.
const LEAVES = [
  { pos: "-left-[90px] -top-[70px] md:-left-[120px] md:-top-[120px]", size: "h-[300px] w-[300px] md:h-[420px] md:w-[420px]", radius: "0 76% 0 76%", bg: "rgba(71,113,58,.10)" },
  { pos: "-left-[30px] top-[30px] md:-left-[40px] md:top-[20px]", size: "h-[200px] w-[200px] md:h-[250px] md:w-[250px]", radius: "0 76% 0 76%", bg: "rgba(71,113,58,.07)" },
  { pos: "-right-[100px] -bottom-[80px] md:-right-[140px] md:-bottom-[140px]", size: "h-[320px] w-[320px] md:h-[460px] md:w-[460px]", radius: "76% 0 76% 0", bg: "rgba(71,113,58,.10)" },
  { pos: "-right-6 bottom-6 md:-right-[30px] md:bottom-[10px]", size: "h-[190px] w-[190px] md:h-[250px] md:w-[250px]", radius: "76% 0 76% 0", bg: "rgba(224,114,42,.09)" },
] as const;

export default function SplashScreen() {
  // Default true — server & client render sama (splash tampil) di frame pertama,
  // hindari hydration mismatch. Efek di bawah yang nentuin apakah langsung
  // disembunyikan (sudah pernah tampil di tab ini) atau jalanin timer normal.
  const [visible, setVisible] = useState(true);
  const [exiting, setExiting] = useState(false);
  // Cache hasil cek sessionStorage di ref (bukan baca ulang tiap invocation) —
  // React StrictMode double-invoke efek ini pas dev; kalau baca+tulis sessionStorage
  // diulang di invocation kedua, itu bakal salah baca hasil tulisan invocation
  // pertama sebagai "udah pernah tampil sebelumnya".
  const alreadyShownRef = useRef<boolean | null>(null);

  useEffect(() => {
    if (alreadyShownRef.current === null) {
      try {
        alreadyShownRef.current = !!sessionStorage.getItem(SESSION_KEY);
        if (!alreadyShownRef.current) sessionStorage.setItem(SESSION_KEY, "1");
      } catch {
        // sessionStorage gak tersedia — anggap belum pernah tampil di sesi ini.
        alreadyShownRef.current = false;
      }
    }

    if (alreadyShownRef.current) {
      const t = setTimeout(() => setVisible(false), 0);
      return () => clearTimeout(t);
    }

    const minTimer = setTimeout(() => {
      setExiting(true);
      setTimeout(() => setVisible(false), EXIT_MS);
    }, MIN_DISPLAY_MS);
    return () => clearTimeout(minTimer);
  }, []);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-hidden bg-[var(--cream-100)] transition-opacity motion-reduce:transition-none"
      style={{ transitionDuration: `${EXIT_MS}ms`, transitionTimingFunction: "cubic-bezier(.2,0,.2,1)", opacity: exiting ? 0 : 1 }}
      aria-hidden
    >
      {/* Dekorasi daun — non-interaktif, terpotong di tepi layar (nilai mobile; md: nilai desktop) */}
      {LEAVES.map((leaf, i) => (
        <div
          key={i}
          className={`pointer-events-none absolute ${leaf.pos} ${leaf.size}`}
          style={{ borderRadius: leaf.radius, background: leaf.bg, transform: "translateZ(0)" }}
        />
      ))}

      <div
        className="relative z-10 flex h-full flex-col items-center justify-center gap-[14px] px-11 md:gap-5"
        style={{ transform: exiting ? "scale(0.88)" : "scale(1)", transition: `transform ${EXIT_MS}ms cubic-bezier(.2,0,.2,1)` }}
      >
        <Image
          src="/logo-farmhill-store.png"
          alt="Farmhill Store"
          width={600}
          height={254}
          priority
          className="h-auto w-[228px] max-w-[62vw] md:w-[300px]"
        />
        <p className="text-center text-[15px] text-[#3F3123] md:text-[16px]">Taste Healthy, Live Happier</p>
      </div>

      <div className="absolute inset-x-0 bottom-0 flex flex-col items-center gap-3 px-10 pb-10 md:gap-0 md:pb-[26px]">
        <div className="h-[3px] w-[140px] overflow-hidden rounded-full bg-[rgba(46,35,24,.12)] md:mt-2.5 md:w-[170px]">
          <div
            className="h-full w-full bg-[var(--leaf-600)] motion-reduce:animate-none"
            style={{ animation: "fhSplashBar 1.6s cubic-bezier(.2,0,.2,1) infinite" }}
          />
        </div>
        <p className="text-[13px] text-[var(--earth-500)]">Memuat…</p>
        <div className="mt-3 flex flex-col items-center gap-0.5 md:mt-0">
          <p className="text-[13px] text-[var(--earth-500)]">PT Kebun Bumi Lestari</p>
          <p className="text-[12px] text-[var(--earth-400)]" style={{ fontFamily: "var(--font-mono)" }}>
            {VERSION_LABEL}
          </p>
        </div>
      </div>

      <style>{`
        @keyframes fhSplashBar { 0% { transform: translateX(-100%); } 100% { transform: translateX(0); } }
        @media (prefers-reduced-motion: reduce) {
          .motion-reduce\\:animate-none { animation: none !important; transform: translateX(0) !important; }
        }
      `}</style>
    </div>
  );
}
