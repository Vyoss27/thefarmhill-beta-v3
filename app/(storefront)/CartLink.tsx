"use client";

import Link from "next/link";
import { ShoppingCart } from "lucide-react";
import { useCart } from "@/lib/cart-context";

export default function CartLink() {
  const { count } = useCart();

  return (
    <Link
      href="/checkout"
      aria-label="Keranjang"
      className="relative flex h-10 w-10 items-center justify-center rounded-[var(--radius-control)] text-[var(--text-body)] transition-colors hover:bg-[var(--surface-hover)]"
    >
      <ShoppingCart size={20} strokeWidth={1.75} />
      {count > 0 && (
        <span className="absolute right-1 top-1 flex h-[18px] min-w-[18px] items-center justify-center rounded-[var(--radius-badge)] bg-[var(--surface-accent)] px-1 text-[11px] font-semibold text-[var(--text-on-accent)]">
          {count}
        </span>
      )}
    </Link>
  );
}
