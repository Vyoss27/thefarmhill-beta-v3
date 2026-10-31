"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Inbox } from "lucide-react";

export type QAItem = { q: string; a: string };

export default function QAAccordion({ items }: { items: QAItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div>
      <div className="flex flex-col divide-y divide-[var(--border-subtle)] rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)]">
        {items.map((item, i) => {
          const open = openIndex === i;
          return (
            <div key={item.q}>
              <button
                type="button"
                onClick={() => setOpenIndex(open ? null : i)}
                className="flex w-full items-center justify-between gap-3 px-4 py-3.5 text-left text-sm font-semibold text-[var(--text-heading)]"
              >
                {item.q}
                <ChevronDown
                  size={18}
                  strokeWidth={1.75}
                  className={`flex-none text-[var(--text-muted)] transition-transform ${open ? "rotate-180" : ""}`}
                />
              </button>
              {open && (
                <p className="px-4 pb-4 text-[13.5px] leading-relaxed text-[var(--text-muted)]">{item.a}</p>
              )}
            </div>
          );
        })}
      </div>
      <Link
        href="/chat"
        className="mt-3 flex items-center gap-2 text-[13px] font-medium text-[var(--text-link)] hover:text-[var(--text-link-hover)]"
      >
        <Inbox size={16} strokeWidth={1.75} />
        Pertanyaan lain? Chat sales
      </Link>
    </div>
  );
}
