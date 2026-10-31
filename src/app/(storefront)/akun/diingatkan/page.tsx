import Image from "next/image";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Bell } from "lucide-react";
import { db } from "@/lib/db";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { CATEGORY_ICON } from "@/lib/catalog";
import HapusWaitlistButton from "./HapusWaitlistButton";

export default async function ProdukDiingatkanPage() {
  const customer = await getCurrentCustomer();
  if (!customer) redirect("/login");

  const items = await db.waitlist.findMany({
    where: { customerId: customer.id },
    include: { product: { include: { photos: { orderBy: { urutan: "asc" }, take: 1 } } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-serif text-[28px] font-semibold tracking-[-0.01em] text-[var(--text-heading)]">Produk yang Diingatkan</h1>
      <p className="mt-1.5 text-[15px] text-[var(--text-muted)]">Kami kabari lewat WhatsApp begitu batch panen berikutnya masuk.</p>

      {items.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2.5 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-10 text-center">
          <Bell size={28} strokeWidth={1.5} className="text-[var(--text-subtle)]" />
          <p className="text-sm text-[var(--text-muted)]">Belum ada produk yang kamu ingatkan.</p>
        </div>
      ) : (
        <div className="mt-5 flex flex-col divide-y divide-[var(--border-subtle)] rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)]">
          {items.map((item) => {
            const Icon = CATEGORY_ICON[item.product.jenisItem];
            return (
              <div key={item.id} className="flex items-center gap-3 px-4 py-3">
                <Link href={`/produk/${item.productId}`} className="flex flex-1 items-center gap-3">
                  <div className="relative flex h-12 w-12 flex-none items-center justify-center overflow-hidden rounded-[var(--radius-control)] bg-[var(--surface-sunken)]">
                    {item.product.photos[0]?.url ? (
                      <Image src={item.product.photos[0].url} alt={item.product.nama} fill className="object-cover" />
                    ) : (
                      Icon && <Icon size={20} strokeWidth={1.5} className="text-[var(--text-subtle)]" />
                    )}
                  </div>
                  <span className="text-sm font-semibold text-[var(--text-heading)]">{item.product.nama}</span>
                </Link>
                <HapusWaitlistButton productId={item.productId} />
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
