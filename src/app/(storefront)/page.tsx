import Link from "next/link";
import { ChevronRight, Search, Truck } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { toCatalogEntries, type CatalogProduct } from "@/lib/catalog-query";
import { CATEGORY_LABEL, CATEGORY_ICON } from "@/lib/catalog";
import { FAQ_ITEMS } from "@/lib/faq-data";
import HeroCarousel, { type HeroSlide } from "./HeroCarousel";
import ProductCard from "./ProductCard";
import QAAccordion from "./QAAccordion";

const HERO_SLIDES: HeroSlide[] = [
  {
    overline: "Kebun sendiri · Semarang",
    title: "Melon hidroponik, dipetik & dikemas hari ini",
    ctaLabel: "Lihat panen hari ini",
    ctaHref: "/katalog?kategori=melon",
    imageSrc: "/produk/sunray-melon.jpg",
  },
  {
    overline: "Untuk hadiah",
    title: "Hampers melon & buah segar, siap kirim",
    ctaLabel: "Lihat paket & hampers",
    ctaHref: "/katalog?kategori=paket",
    imageSrc: "/produk/amaiame-melon.jpg",
  },
  {
    overline: "Segar setiap hari",
    title: "Buah potong & jus, tanpa pengawet",
    ctaLabel: "Lihat menu segar",
    ctaHref: "/katalog?kategori=buah_potong",
    imageSrc: "/produk/elysia-melon.jpg",
  },
];

const CATEGORY_ROW: { value: string; label: string }[] = [
  { value: "melon", label: "Melon" },
  { value: "buah_potong", label: "Buah Potong" },
  { value: "paket", label: "Paket" },
  { value: "minuman", label: "Minuman" },
  { value: "buah", label: "Buah" },
];


export default async function HomePage() {
  const products = await db.product.findMany({
    where: { status: { in: ["aktif", "habis"] } },
    include: { saleUnits: { include: { stock: true } }, stock: true, photos: { orderBy: { urutan: "asc" }, take: 1 } },
    orderBy: { createdAt: "asc" },
  });
  const catalogProducts = products.flatMap(toCatalogEntries);
  // byId = kartu utama (Perfect / produk biasa); kartu Imperfect dipegang terpisah di bagian "Sale".
  const byId = new Map(catalogProducts.filter((p) => p.variant !== "imperfect").map((p) => [p.id, p]));
  const entryByKey = new Map(catalogProducts.map((p) => [p.entryKey, p]));

  const now = new Date();

  // Terlaris minggu ini — agregat qty 7 hari terakhir dari order valid, fallback kurasi manual kalau data kurang.
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const recentItems = await db.orderItem.findMany({
    where: { order: { createdAt: { gte: sevenDaysAgo }, status: { notIn: ["dibatalkan", "kedaluwarsa"] } } },
    include: { saleUnit: { select: { productId: true } } },
  });
  const salesByProduct = new Map<string, number>();
  for (const item of recentItems) {
    const pid = item.saleUnit.productId;
    salesByProduct.set(pid, (salesByProduct.get(pid) ?? 0) + Number(item.qty));
  }
  const rankedIds = [...salesByProduct.entries()].sort((a, b) => b[1] - a[1]).map(([pid]) => pid);
  const terlaris: CatalogProduct[] = [];
  for (const pid of rankedIds) {
    const p = byId.get(pid);
    if (p && !p.isHabis) terlaris.push(p);
    if (terlaris.length >= 4) break;
  }
  if (terlaris.length < 4) {
    for (const p of catalogProducts) {
      if (terlaris.length >= 4) break;
      if (!p.isHabis && !terlaris.some((t) => t.id === p.id)) terlaris.push(p);
    }
  }
  const terlarisWithRank = terlaris.map((p, i) => ({ ...p, rankBadge: i + 1 }));

  // Pesan lagi — produk dari pesanan pelanggan sebelumnya (hanya kalau sudah login & pernah memesan).
  const customer = await getCurrentCustomer();
  const pesanLagi: CatalogProduct[] = [];
  if (customer) {
    const sebelumnya = await db.orderItem.findMany({
      where: { order: { customerId: customer.id, status: { notIn: ["dibatalkan", "kedaluwarsa"] } } },
      orderBy: { order: { createdAt: "desc" } },
      take: 60,
      select: { saleUnit: { select: { productId: true, grade: true } } },
    });
    const sudah = new Set<string>();
    for (const item of sebelumnya) {
      const pid = item.saleUnit.productId;
      // Pesanan Imperfect kembali ke kartu Imperfect (Sale); selain itu ke kartu utama produknya.
      const key = item.saleUnit.grade === "imperfect" && entryByKey.has(`${pid}:imperfect`) ? `${pid}:imperfect` : pid;
      if (sudah.has(key)) continue;
      sudah.add(key);
      const p = entryByKey.get(key);
      if (p) pesanLagi.push(p);
      if (pesanLagi.length >= 8) break;
    }
  }

  // Baru dipetik hari ini — belum ada field tanggal panen, fallback: produk melon dengan stok > 0.
  const baruDipetik = catalogProducts
    .filter((p) => p.jenisItem === "melon" && p.variant !== "imperfect" && !p.isHabis)
    .map((p) => ({ ...p, caption: `Sisa ${p.stokTersisa} ${p.cheapest?.satuan ?? p.grades?.[0]?.satuan ?? ""}` }));

  // Sale = melon grade Imperfect, kartu terpisah dari Perfect (masukan sales).
  const sale = catalogProducts
    .filter((p) => p.variant === "imperfect" && !p.isHabis)
    .map((p) => ({ ...p, caption: `Sisa ${p.stokTersisa} ${p.cheapest?.satuan ?? ""}`.trim() }));

  const paket = catalogProducts.filter((p) => p.jenisItem === "paket" || p.jenisItem === "paket_melon");
  const minuman = catalogProducts.filter((p) => p.jenisItem === "minuman").map((p) => ({ ...p, hideQuickAdd: true }));

  return (
    <div className="flex flex-col gap-8">
      <Link
        href="/katalog"
        className="flex h-11 items-center gap-2.5 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3.5 text-sm text-[var(--text-subtle)]"
      >
        <Search size={17} strokeWidth={2} />
        Cari melon, jus, hampers…
      </Link>

      <HeroCarousel slides={HERO_SLIDES} />

      <Link
        href="/checkout"
        className="flex items-center justify-between gap-3 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-3.5"
      >
        <div className="flex items-center gap-3">
          <Truck size={18} strokeWidth={1.75} className="flex-none text-[var(--text-brand)]" />
          <div>
            <p className="text-sm font-semibold text-[var(--text-heading)]">Pilih tanggal kirim saat checkout</p>
            <p className="text-[13px] text-[var(--text-muted)]">Sales konfirmasi pesananmu lewat WhatsApp</p>
          </div>
        </div>
        <ChevronRight size={18} strokeWidth={1.75} className="flex-none text-[var(--text-muted)]" />
      </Link>

      <div className="grid grid-cols-5 gap-2">
        {CATEGORY_ROW.map((cat) => {
          const Icon = CATEGORY_ICON[cat.value];
          return (
            <Link key={cat.value} href={`/katalog?kategori=${cat.value}`} className="flex flex-col items-center gap-1.5">
              <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--surface-brand-soft)] text-[var(--text-brand)]">
                {Icon && <Icon size={24} strokeWidth={1.5} />}
              </span>
              <span className="text-center text-[11.5px] font-medium text-[var(--text-body)]">{CATEGORY_LABEL[cat.value] ?? cat.label}</span>
            </Link>
          );
        })}
      </div>

      {pesanLagi.length > 0 && (
        <section>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-[20px] font-semibold text-[var(--text-heading)]">Pesan lagi</h2>
              <p className="text-[13px] text-[var(--text-muted)]">Dari pesanan kamu sebelumnya</p>
            </div>
            <Link href="/akun/pesanan" className="text-[13px] font-semibold text-[var(--text-link)] hover:text-[var(--text-link-hover)]">
              Riwayat
            </Link>
          </div>
          <div className="mt-3.5 flex gap-3.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {pesanLagi.map((p) => (
              <ProductCard key={p.entryKey} product={p} className="w-[146px] flex-none" />
            ))}
          </div>
        </section>
      )}

      <section>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-[20px] font-semibold text-[var(--text-heading)]">Terlaris minggu ini</h2>
            <p className="text-[13px] text-[var(--text-muted)]">Urutan dari pesanan 7 hari terakhir</p>
          </div>
          <Link href="/katalog" className="text-[13px] font-semibold text-[var(--text-link)] hover:text-[var(--text-link-hover)]">
            Lihat semua
          </Link>
        </div>
        <div className="mt-3.5 grid grid-cols-2 gap-3.5 sm:grid-cols-4">
          {terlarisWithRank.map((p) => (
            <ProductCard key={p.entryKey} product={p} />
          ))}
        </div>
      </section>

      {sale.length > 0 && (
        <section>
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-serif text-[20px] font-semibold text-[var(--text-heading)]">Sale</h2>
              <p className="text-[13px] text-[var(--text-muted)]">Melon grade Imperfect, harga lebih terjangkau</p>
            </div>
            <Link href="/katalog?kategori=sale" className="text-[13px] font-semibold text-[var(--text-link)] hover:text-[var(--text-link-hover)]">
              Lihat semua
            </Link>
          </div>
          <div className="mt-3.5 flex gap-3.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {sale.map((p) => (
              <ProductCard key={p.entryKey} product={p} className="w-[146px] flex-none" />
            ))}
          </div>
        </section>
      )}

      {baruDipetik.length > 0 && (
        <section>
          <h2 className="font-serif text-[20px] font-semibold text-[var(--text-heading)]">Baru dipetik hari ini</h2>
          <p className="text-[13px] text-[var(--text-muted)]">{baruDipetik.length} varietas melon tersedia</p>
          <div className="mt-3.5 flex gap-3.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {baruDipetik.map((p) => (
              <ProductCard key={p.entryKey} product={p} className="w-[146px] flex-none" />
            ))}
          </div>
        </section>
      )}

      {paket.length > 0 && (
        <section>
          <h2 className="font-serif text-[20px] font-semibold text-[var(--text-heading)]">Paket &amp; hampers</h2>
          <div className="mt-3.5 grid grid-cols-2 gap-3.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {paket.map((p) => (
              <ProductCard key={p.entryKey} product={p} />
            ))}
          </div>
        </section>
      )}

      {minuman.length > 0 && (
        <section>
          <h2 className="font-serif text-[20px] font-semibold text-[var(--text-heading)]">Minuman segar</h2>
          <div className="mt-3.5 flex gap-3.5 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
            {minuman.map((p) => (
              <ProductCard key={p.entryKey} product={p} className="w-[132px] flex-none" />
            ))}
          </div>
        </section>
      )}

      <p className="rounded-[var(--radius-card)] bg-[var(--surface-sunken)] px-4 py-3.5 text-[13px] leading-relaxed text-[var(--text-muted)]">
        Pesanan dikemas di Gudang Cinde Barat, Semarang. Ongkir dihitung sales setelah pesanan masuk — muncul di rincian
        sebelum pembayaran.
      </p>

      <section>
        <div className="flex items-center justify-between">
          <div>
            <h2 className="font-serif text-[20px] font-semibold text-[var(--text-heading)]">Pertanyaan yang sering masuk</h2>
            <p className="text-[13px] text-[var(--text-muted)]">Dijawab sales di jam 08.00–17.00 WIB</p>
          </div>
          <Link href="/faq" className="text-[13px] font-semibold text-[var(--text-link)] hover:text-[var(--text-link-hover)]">
            Lihat semua
          </Link>
        </div>
        <div className="mt-3.5">
          <QAAccordion items={FAQ_ITEMS} />
        </div>
      </section>
    </div>
  );
}
