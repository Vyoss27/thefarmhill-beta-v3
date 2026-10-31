"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import Image from "next/image";

export type HeroSlide = {
  overline: string;
  title: string;
  ctaLabel: string;
  ctaHref: string;
  imageSrc: string;
};

export default function HeroCarousel({ slides }: { slides: HeroSlide[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  function scrollToSlide(i: number) {
    const track = trackRef.current;
    if (!track) return;
    track.scrollTo({ left: track.clientWidth * i, behavior: "smooth" });
    setActive(i);
  }

  function handleScroll() {
    const track = trackRef.current;
    if (!track) return;
    const i = Math.round(track.scrollLeft / track.clientWidth);
    setActive(i);
  }

  // Auto-geser tiap 6 detik — timer reset tiap kali `active` berubah (baik dari
  // sini maupun dari swipe/klik dot manual), jadi slide yang lagi diliat tidak
  // keburu ke-skip.
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setTimeout(() => {
      scrollToSlide((active + 1) % slides.length);
    }, 6000);
    return () => clearTimeout(timer);
  }, [active, slides.length]);

  return (
    <div>
      <div
        ref={trackRef}
        onScroll={handleScroll}
        className="flex snap-x snap-mandatory overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {slides.map((slide, i) => (
          <Link
            key={i}
            href={slide.ctaHref}
            className="relative flex h-[190px] w-full flex-none snap-start items-center overflow-hidden rounded-[var(--radius-card)] bg-[var(--surface-brand)] px-5"
          >
            <div className="relative z-10 max-w-[62%]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--leaf-200,#cfe0c6)]">{slide.overline}</p>
              <h2 className="mt-1.5 font-serif text-[22px] font-semibold leading-tight text-[var(--text-on-brand)]">{slide.title}</h2>
              <span className="mt-3 inline-flex h-9 items-center rounded-[var(--radius-control)] bg-[var(--surface-accent)] px-3.5 text-[13px] font-semibold text-[var(--text-on-accent)]">
                {slide.ctaLabel}
              </span>
            </div>
            <div className="absolute inset-y-0 right-[-30px] w-[55%]">
              <Image src={slide.imageSrc} alt="" fill className="object-cover" priority={i === 0} />
            </div>
          </Link>
        ))}
      </div>
      <div className="mt-3 flex justify-center gap-1.5">
        {slides.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Slide ${i + 1}`}
            onClick={() => scrollToSlide(i)}
            className={`h-[6px] rounded-full transition-all ${i === active ? "w-5 bg-[var(--surface-brand)]" : "w-[6px] bg-[var(--border-strong)]"}`}
          />
        ))}
      </div>
    </div>
  );
}
