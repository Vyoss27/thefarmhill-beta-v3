import { db } from "@/lib/db";
import { toCatalogEntries } from "@/lib/catalog-query";
import CatalogClient from "../CatalogClient";

export default async function KatalogPage({
  searchParams,
}: {
  searchParams: Promise<{ kategori?: string; cari?: string }>;
}) {
  const { kategori, cari } = await searchParams;

  const products = await db.product.findMany({
    where: { status: { in: ["aktif", "habis"] } },
    include: { saleUnits: { include: { stock: true } }, stock: true, photos: { orderBy: { urutan: "asc" }, take: 1 } },
    orderBy: { createdAt: "asc" },
  });

  const catalogProducts = products.flatMap(toCatalogEntries);
  const categories: string[] = Array.from(new Set(products.map((p) => p.jenisItem)));
  // Melon Imperfect tampil sebagai kartu terpisah di kategori "Sale".
  if (catalogProducts.some((p) => p.variant === "imperfect")) categories.push("sale");

  return (
    <div>
      <h1 className="font-serif text-[28px] font-semibold tracking-[-0.01em] text-[var(--text-heading)]">Katalog</h1>
      <p className="mt-1.5 text-[15px] text-[var(--text-muted)]">
        Dipetik &amp; dikemas hari ini
      </p>

      <CatalogClient
        products={catalogProducts}
        categories={categories}
        initialCategory={kategori}
        initialSearch={cari}
      />
    </div>
  );
}
