import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/catalog";
import { tanggalDenganJam } from "@/lib/slot";
import AdminPesananTable, { type OrderRow } from "./AdminPesananTable";

export default async function AdminPesananPage() {
  const orders = await db.order.findMany({
    include: { customer: true, items: true },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const rows: OrderRow[] = orders.map((order) => ({
    id: order.id,
    customerNama: order.customer.nama,
    customerWa: order.customer.wa,
    itemCount: order.items.length,
    slotLabel: tanggalDenganJam(order.tanggalSlot.toLocaleDateString("id-ID", { day: "numeric", month: "short", timeZone: "UTC" }), order.jamSlot),
    totalLabel: formatRupiah(Number(order.total)),
    totalRaw: Number(order.total),
    status: order.status,
    createdAtIso: order.createdAt.toISOString(),
  }));

  const pendingCount = orders.filter((o) => o.status === "menunggu_konfirmasi").length;

  return (
    <div>
      <div>
        <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-subtle)]">
          Panel admin
        </span>
        <h1 className="mt-1 font-serif text-[28px] font-semibold tracking-[-0.01em] text-[var(--text-heading)]">
          Pesanan
        </h1>
        {pendingCount > 0 && (
          <p className="mt-1 text-sm text-[var(--text-accent)]">{pendingCount} pesanan menunggu konfirmasi kamu.</p>
        )}
      </div>

      <div className="mt-4">
        <AdminPesananTable orders={rows} />
      </div>

      <p className="mt-3 text-[13px] text-[var(--text-muted)]">
        Konfirmasi pesanan dan pengisian ongkir tetap di halaman detail.
      </p>
    </div>
  );
}
