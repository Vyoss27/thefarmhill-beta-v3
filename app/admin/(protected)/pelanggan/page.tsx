import { db } from "@/lib/db";
import CustomerRow from "./CustomerRow";

export default async function AdminPelangganPage() {
  const customers = await db.customer.findMany({
    include: { orders: { select: { total: true, status: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div>
      <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-subtle)]">
        Panel admin
      </span>
      <h1 className="mt-1 font-serif text-[28px] font-semibold tracking-[-0.01em] text-[var(--text-heading)]">
        Pelanggan
      </h1>
      <p className="mt-1.5 text-[15px] text-[var(--text-muted)]">
        Dibuat otomatis dari checkout pertama — bisa diedit manual lewat tombol Edit di tiap baris.
      </p>

      <div className="mt-5 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--surface-sunken)] text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                <th className="px-5 py-2.5 font-semibold">Nama</th>
                <th className="px-3 py-2.5 font-semibold">WhatsApp</th>
                <th className="px-3 py-2.5 font-semibold">Segmen</th>
                <th className="px-3 py-2.5 text-right font-semibold">Jumlah pesanan</th>
                <th className="px-5 py-2.5 text-right font-semibold">Total belanja</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {customers.map((c, idx) => {
                const validOrders = c.orders.filter((o) => o.status !== "dibatalkan" && o.status !== "kedaluwarsa");
                const totalBelanja = validOrders.reduce((sum, o) => sum + Number(o.total), 0);
                return (
                  <CustomerRow
                    key={c.id}
                    zebra={idx % 2 === 1}
                    jumlahPesanan={c.orders.length}
                    totalBelanja={totalBelanja}
                    customer={{
                      id: c.id,
                      nama: c.nama,
                      wa: c.wa,
                      email: c.email,
                      alamat: c.alamat,
                      segmen: c.segmen,
                    }}
                  />
                );
              })}
              {customers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-[var(--text-muted)]">
                    Belum ada pelanggan.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
