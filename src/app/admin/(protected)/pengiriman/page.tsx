import { db } from "@/lib/db";

export default async function AdminPengirimanPage() {
  const todayStr = new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Jakarta" });
  const start = new Date(`${todayStr}T00:00:00Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 6);

  const orders = await db.order.findMany({
    where: { tanggalSlot: { gte: start, lte: end }, status: { notIn: ["dibatalkan", "kedaluwarsa"] } },
    select: { tanggalSlot: true },
  });

  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    return d;
  });

  return (
    <div>
      <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-subtle)]">
        Panel admin
      </span>
      <h1 className="mt-1 font-serif text-[28px] font-semibold tracking-[-0.01em] text-[var(--text-heading)]">
        Pengiriman
      </h1>
      <p className="mt-1.5 text-[15px] text-[var(--text-muted)]">
        Pelanggan hanya memilih tanggal kirim — tidak ada pilihan jam, cut-off, atau batas kapasitas. Daftar driver, muatan,
        dan bukti serah terima belum dibangun.
      </p>

      <div className="mt-5 max-w-[420px] rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] p-5">
        <h2 className="text-sm font-semibold text-[var(--text-heading)]">Pesanan per tanggal kirim, 7 hari ke depan</h2>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
              <th className="py-1.5 font-semibold">Tanggal</th>
              <th className="py-1.5 text-right font-semibold">Pesanan</th>
            </tr>
          </thead>
          <tbody>
            {days.map((d) => {
              const dateStr = d.toISOString().slice(0, 10);
              const jumlah = orders.filter((o) => o.tanggalSlot.toISOString().slice(0, 10) === dateStr).length;
              return (
                <tr key={dateStr} className="border-t border-[var(--border-subtle)]">
                  <td className="py-1.5 text-[var(--text-body)]">
                    {d.toLocaleDateString("id-ID", { dateStyle: "medium", timeZone: "UTC" })}
                  </td>
                  <td className="fh-numeric py-1.5 text-right font-semibold text-[var(--text-heading)]">{jumlah}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
