"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { Plus } from "lucide-react";
import { CATEGORY_ICON, formatRupiah } from "@/lib/catalog";
import { useCart } from "@/lib/cart-context";
import type { CatalogProduct } from "@/lib/catalog-query";
import { melonGradeLabel } from "@/lib/melon-grade";
import { joinWaitlist } from "@/lib/actions/waitlist";

export default function ProductCard({ product, className }: { product: CatalogProduct; className?: string }) {
  const router = useRouter();
  const { addItem } = useCart();
  const Icon = CATEGORY_ICON[product.jenisItem];
  const [selectedGrade, setSelectedGrade] = useState(product.grades?.[0]?.grade ?? null);
  const [waitlistState, setWaitlistState] = useState<"idle" | "loading" | "done">("idle");
  const activeUnit = product.grades ? product.grades.find((g) => g.grade === selectedGrade) ?? product.grades[0] : product.cheapest;

  async function handleKabariSaya(e: React.MouseEvent) {
    e.preventDefault();
    setWaitlistState("loading");
    const result = await joinWaitlist({ productId: product.id });
    if (!result.ok) {
      if (result.error === "login_required") {
        router.push("/login");
        return;
      }
      setWaitlistState("idle");
      return;
    }
    setWaitlistState("done");
  }

  function handleQuickAdd(e: React.MouseEvent) {
    e.preventDefault();
    if (!activeUnit) return;
    if (!product.grades && product.unitCount > 1) {
      router.push(`/produk/${product.id}`);
      return;
    }
    addItem({
      productId: product.id,
      saleUnitId: activeUnit.saleUnitId,
      nama: product.nama,
      satuan: activeUnit.satuan,
      harga: activeUnit.harga,
      minOrder: activeUnit.minOrder,
      qty: activeUnit.minOrder,
      jenisItem: product.jenisItem,
    });
  }

  return (
    <a
      href={product.href}
      className={`group relative flex flex-col overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] transition-shadow hover:shadow-[var(--shadow-card-hover)] ${className ?? ""}`}
    >
      <div className="relative flex aspect-[4/3] items-center justify-center bg-[var(--surface-sunken)] p-4">
        {product.fotoUrl ? (
          <Image
            src={product.fotoUrl}
            alt={product.nama}
            fill
            sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
            className="object-cover"
          />
        ) : (
          Icon && <Icon size={40} strokeWidth={1.4} className="text-[var(--text-subtle)]" />
        )}
        {product.variant === "imperfect" && (
          <span className="absolute right-2.5 top-2.5 flex h-[22px] items-center justify-center rounded-[var(--radius-badge)] bg-[var(--status-danger-bg)] px-2 text-[11px] font-semibold uppercase tracking-[0.04em] text-[var(--status-danger-fg)]">
            Sale
          </span>
        )}
        {product.rankBadge && (
          <span className="fh-numeric absolute left-2.5 top-2.5 flex h-[22px] items-center justify-center rounded-[var(--radius-badge)] bg-[var(--surface-inverse)] px-2 text-[11px] font-semibold text-[var(--text-inverse)]">
            #{product.rankBadge}
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        {product.grades && (
          <div className="flex flex-col gap-1" onClick={(e) => e.preventDefault()}>
            <span className="text-[10px] font-semibold uppercase tracking-[0.07em] text-[var(--text-subtle)]">Grade</span>
            <div className="flex gap-1.5">
              {product.grades.map((g) => (
                <button
                  key={g.grade}
                  type="button"
                  onClick={() => setSelectedGrade(g.grade)}
                  className={`flex h-[22px] items-center justify-center rounded-[var(--radius-badge)] px-2 text-[11.5px] font-semibold transition-colors ${
                    selectedGrade === g.grade
                      ? "bg-[var(--surface-brand)] text-[var(--text-on-brand)]"
                      : "border border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-body)]"
                  }`}
                >
                  {melonGradeLabel(g.grade)}
                </button>
              ))}
            </div>
          </div>
        )}
        <h3 className="text-[15px] font-semibold leading-snug text-[var(--text-heading)]">{product.nama}</h3>
        {(product.caption || product.variant === "imperfect") && (
          <p className="text-[12px] text-[var(--text-muted)]">{product.caption ?? "Grade Imperfect"}</p>
        )}
        {activeUnit && (
          <div className="mt-auto flex items-end justify-between gap-2">
            {activeUnit.harga > 0 ? (
              <p className="fh-numeric text-[15px] font-semibold text-[var(--text-brand)]">
                {formatRupiah(activeUnit.harga)}
                <span className="text-xs font-normal text-[var(--text-muted)]"> / {activeUnit.satuan}</span>
              </p>
            ) : (
              <p className="text-[13px] font-medium text-[var(--text-muted)]">Segera hadir</p>
            )}
            {!product.isHabis && !product.hideQuickAdd && activeUnit.harga > 0 && (
              <button
                type="button"
                onClick={handleQuickAdd}
                aria-label="Tambah ke keranjang"
                className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-[var(--radius-control)] bg-[var(--action-primary-bg)] text-[var(--text-on-brand)] transition-colors hover:bg-[var(--action-primary-bg-hover)]"
              >
                <Plus size={19} strokeWidth={2.25} />
              </button>
            )}
          </div>
        )}
      </div>

      {product.isHabis && (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 bg-[rgba(251,247,239,0.86)] p-4">
          <span className="rounded-[var(--radius-badge)] bg-[var(--status-neutral-bg)] px-2 py-1 text-[11px] font-semibold text-[var(--status-neutral-fg)]">
            Habis
          </span>
          <button
            type="button"
            disabled={waitlistState !== "idle"}
            onClick={handleKabariSaya}
            className="rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 py-1.5 text-[13px] font-medium text-[var(--text-body)] disabled:opacity-70"
          >
            {waitlistState === "done" ? "Diingatkan ✓" : waitlistState === "loading" ? "…" : "Kabari saya"}
          </button>
        </div>
      )}
    </a>
  );
}
