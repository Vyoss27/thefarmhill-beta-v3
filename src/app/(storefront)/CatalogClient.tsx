"use client";

import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { CATEGORY_LABEL } from "@/lib/catalog";
import type { CatalogProduct } from "@/lib/catalog-query";
import ProductCard from "./ProductCard";

export type { CatalogProduct };

export default function CatalogClient({
  products,
  categories,
  initialCategory,
  initialSearch,
}: {
  products: CatalogProduct[];
  categories: string[];
  initialCategory?: string;
  initialSearch?: string;
}) {
  const [active, setActive] = useState<string>(initialCategory && categories.includes(initialCategory) ? initialCategory : "semua");
  const [search, setSearch] = useState(initialSearch ?? "");

  const filtered = useMemo(() => {
    // "Sale" = kartu melon Imperfect; kategori Melon hanya menampilkan kartu Perfect.
    const byCategory =
      active === "semua"
        ? products
        : active === "sale"
          ? products.filter((p) => p.variant === "imperfect")
          : products.filter((p) => p.jenisItem === active && p.variant !== "imperfect");
    const term = search.trim().toLowerCase();
    if (!term) return byCategory;
    return byCategory.filter((p) => p.nama.toLowerCase().includes(term));
  }, [products, active, search]);

  return (
    <div>
      <div className="relative mt-5">
        <Search size={17} strokeWidth={2} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-subtle)]" />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari melon, jus, hampers…"
          className="h-11 w-full rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-card)] pl-10 pr-3 text-sm text-[var(--text-body)] outline-none transition-[border-color,box-shadow] focus:border-[var(--border-focus)] focus:shadow-[var(--shadow-focus)]"
        />
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <CategoryChip label="Semua" active={active === "semua"} onClick={() => setActive("semua")} />
        {categories.map((cat) => (
          <CategoryChip key={cat} label={cat === "sale" ? "Sale" : (CATEGORY_LABEL[cat] ?? cat)} active={active === cat} onClick={() => setActive(cat)} />
        ))}
      </div>

      {filtered.length === 0 ? (
        <p className="mt-8 text-center text-sm text-[var(--text-muted)]">Produk tidak ditemukan.</p>
      ) : (
        <div className="mt-5 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {filtered.map((product) => (
            <ProductCard key={product.entryKey} product={product} />
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryChip({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-[var(--radius-control)] px-3 py-2 text-[13px] font-medium transition-colors ${
        active
          ? "bg-[var(--surface-brand)] font-semibold text-[var(--text-on-brand)]"
          : "border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-body)] hover:border-[var(--border-strong)]"
      }`}
    >
      {label}
    </button>
  );
}
