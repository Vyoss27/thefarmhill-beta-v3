import Link from "next/link";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { CATEGORY_LABEL, CATEGORY_ICON } from "@/lib/catalog";
import { stockUnitId, usesUnitStock } from "@/lib/stock-target";
import { MELON_SIZES } from "@/lib/melon-size";
import ProductDetailClient from "./ProductDetailClient";

export default async function ProductDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ grade?: string }>;
}) {
  const { id } = await params;
  const { grade } = await searchParams;

  const product = await db.product.findUnique({
    where: { id },
    include: { saleUnits: { include: { stock: true } }, stock: true, photos: { orderBy: { urutan: "asc" }, take: 1 } },
  });

  if (!product) notFound();

  const hasSizes = product.saleUnits.some((u) => u.ukuran);
  // Unit Perfect tanpa ukuran hanyalah KOLAM stok — tidak tampil sebagai pilihan.
  let visibleUnits = hasSizes ? product.saleUnits.filter((u) => !(u.grade === "perfect" && !u.ukuran)) : product.saleUnits;

  // Melon dengan Perfect DAN Imperfect: satu halaman = satu grade (Imperfect dijual terpisah di bagian "Sale").
  const adaPerfect = product.saleUnits.some((u) => u.grade === "perfect");
  const adaImperfect = product.saleUnits.some((u) => u.grade === "imperfect" && !u.ukuran);
  const variant = adaPerfect && adaImperfect ? (grade === "imperfect" ? "imperfect" : "perfect") : null;
  if (variant) visibleUnits = visibleUnits.filter((u) => u.grade === variant);
  // Urut Standar -> besar supaya pilihan awal selalu ukuran standar.
  const sizeIndex = (u: { ukuran: string | null }) => (u.ukuran ? MELON_SIZES.findIndex((s) => s.kode === u.ukuran) : -1);
  visibleUnits = [...visibleUnits].sort((a, b) => sizeIndex(a) - sizeIndex(b));

  // Stok tingkat harga Perfect ada di kolam bersama (unit Perfect tanpa size).
  const unitById = new Map(product.saleUnits.map((u) => [u.id, u]));
  const stokKolam = (u: (typeof product.saleUnits)[number]) => unitById.get(stockUnitId(u))?.stock ?? u.stock;
  const tersediaDi = (u: (typeof product.saleUnits)[number]) =>
    Math.max(0, Number(stokKolam(u)?.jumlah ?? 0) - Number(stokKolam(u)?.ditahan ?? 0));

  // Ketersediaan = jumlah semua KOLAM stok milik unit yang tampil (tiap kolam dihitung sekali).
  const kolamIds = new Set(visibleUnits.filter(usesUnitStock).map((u) => stockUnitId(u)));
  const tersedia =
    kolamIds.size > 0
      ? [...kolamIds].reduce((sum, kid) => {
          const s = unitById.get(kid)?.stock;
          return sum + Math.max(0, Number(s?.jumlah ?? 0) - Number(s?.ditahan ?? 0));
        }, 0)
      : Number(product.stock?.jumlah ?? 0) - Number(product.stock?.ditahan ?? 0);
  const isHabis = product.status === "habis" || tersedia <= 0;
  const saleUnits = visibleUnits.map((u) => ({
    id: u.id,
    satuan: u.satuan,
    grade: u.grade,
    ukuran: u.ukuran,
    harga: Number(u.harga),
    estBerat: u.estBerat ? Number(u.estBerat) : null,
    minOrder: u.minOrder,
    stokTersedia: usesUnitStock(u) ? tersediaDi(u) : null,
  }));
  const Icon = CATEGORY_ICON[product.jenisItem];

  return (
    <div>
      <Link
        href="/katalog"
        className="inline-flex items-center gap-1.5 text-[13px] text-[var(--text-muted)] hover:text-[var(--text-link)]"
      >
        <ArrowLeft size={14} strokeWidth={2} />
        Kembali ke katalog
      </Link>

      <div className="mt-4 grid gap-8 md:grid-cols-2 md:items-start">
        <div className="relative flex aspect-square items-center justify-center overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-sunken)]">
          {product.photos[0]?.url ? (
            <Image
              src={product.photos[0].url}
              alt={product.nama}
              fill
              sizes="(min-width: 768px) 50vw, 100vw"
              className="object-cover"
              priority
            />
          ) : (
            Icon && <Icon size={72} strokeWidth={1.2} className="text-[var(--text-subtle)]" />
          )}
        </div>

        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-subtle)]">
            {CATEGORY_LABEL[product.jenisItem] ?? product.jenisItem}
          </span>
          <h1 className="mt-1.5 font-serif text-[30px] font-semibold tracking-[-0.01em] text-[var(--text-heading)]">
            {product.nama}
            {variant === "imperfect" && (
              <span className="ml-2.5 inline-block -translate-y-1 rounded-[var(--radius-badge)] bg-[var(--status-danger-bg)] px-2 py-0.5 align-middle font-sans text-[12px] font-semibold uppercase tracking-[0.04em] text-[var(--status-danger-fg)]">
                Sale
              </span>
            )}
          </h1>
          {product.asalKebun && <p className="mt-2 text-sm text-[var(--text-muted)]">{product.asalKebun}</p>}
          {product.deskripsi && (
            <p className="mt-2.5 max-w-[52ch] text-[15px] leading-relaxed text-[var(--text-body)]">{product.deskripsi}</p>
          )}

          <div className="mt-5">
            <ProductDetailClient
              productId={product.id}
              nama={product.nama}
              jenisItem={product.jenisItem}
              saleUnits={saleUnits}
              isHabis={isHabis}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
