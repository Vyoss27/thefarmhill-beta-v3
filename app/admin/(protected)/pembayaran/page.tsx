import Link from "next/link";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/catalog";
import { createAdminClient } from "@/lib/supabase/admin";
import PaymentVerificationPanel from "../pesanan/[id]/PaymentVerificationPanel";

export default async function AdminPembayaranPage() {
  const menungguBayar = await db.order.findMany({
    where: { status: "menunggu_bayar" },
    include: { customer: true, payments: { orderBy: { waktu: "desc" }, take: 1 } },
    orderBy: { batasBayar: "asc" },
  });

  const perluVerifikasi = menungguBayar.filter((o) => o.payments[0]?.status === "pending");
  const belumAdaBukti = menungguBayar.filter((o) => o.payments[0]?.status !== "pending");

  const supabase = createAdminClient();
  const perluVerifikasiWithUrl = await Promise.all(
    perluVerifikasi.map(async (order) => {
      const payment = order.payments[0];
      let signedUrl: string | null = null;
      if (payment.buktiUrl) {
        const { data } = await supabase.storage.from("bukti-pembayaran").createSignedUrl(payment.buktiUrl, 60 * 10);
        signedUrl = data?.signedUrl ?? null;
      }
      return { order, payment, signedUrl };
    })
  );

  const riwayat = await db.payment.findMany({
    where: { status: { in: ["verified", "rejected"] } },
    include: { order: { include: { customer: true } } },
    orderBy: { waktu: "desc" },
    take: 20,
  });

  return (
    <div>
      <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-subtle)]">Panel admin</span>
      <h1 className="mt-1 font-serif text-[28px] font-semibold tracking-[-0.01em] text-[var(--text-heading)]">Pembayaran</h1>
      <p className="mt-1.5 text-[15px] text-[var(--text-muted)]">
        Tagihan aktif, bukti transfer masuk, dan riwayat verifikasi. Rekonsiliasi otomatis (Midtrans dsb.) belum ada — semua
        masih verifikasi manual.
      </p>

      <section className="mt-6">
        <h2 className="text-[15px] font-semibold text-[var(--text-heading)]">
          Perlu diverifikasi <span className="fh-numeric text-[var(--text-muted)]">({perluVerifikasiWithUrl.length})</span>
        </h2>
        {perluVerifikasiWithUrl.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--text-muted)]">Tidak ada bukti transfer yang menunggu diverifikasi.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-4">
            {perluVerifikasiWithUrl.map(({ order, payment, signedUrl }) => (
              <div key={order.id} className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] p-4">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <Link href={`/admin/pesanan/${order.id}`} className="text-sm font-semibold text-[var(--text-heading)] hover:text-[var(--text-link)]">
                      {order.customer.nama}
                    </Link>
                    <p className="fh-numeric text-[12px] text-[var(--text-muted)]">
                      #{order.id.slice(0, 8).toUpperCase()} · {order.customer.wa}
                    </p>
                  </div>
                  <span className="fh-numeric text-sm font-semibold text-[var(--text-heading)]">{formatRupiah(Number(order.total))}</span>
                </div>
                <PaymentVerificationPanel
                  paymentId={payment.id}
                  metode={payment.metode}
                  nominal={Number(payment.nominal)}
                  buktiSignedUrl={signedUrl}
                  waktu={payment.waktu.toISOString()}
                />
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-[15px] font-semibold text-[var(--text-heading)]">
          Menunggu bukti transfer <span className="fh-numeric text-[var(--text-muted)]">({belumAdaBukti.length})</span>
        </h2>
        {belumAdaBukti.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--text-muted)]">Tidak ada tagihan aktif.</p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--surface-sunken)] text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                  <th className="px-5 py-2.5 font-semibold">Pelanggan</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Total</th>
                  <th className="px-3 py-2.5 font-semibold">Batas bayar</th>
                  <th className="px-5 py-2.5 font-semibold" />
                </tr>
              </thead>
              <tbody>
                {belumAdaBukti.map((order, idx) => (
                  <tr key={order.id} className={`border-b border-[var(--border-subtle)] last:border-0 ${idx % 2 === 1 ? "bg-[var(--surface-sunken)]/40" : ""}`}>
                    <td className="px-5 py-2.5 font-medium text-[var(--text-heading)]">{order.customer.nama}</td>
                    <td className="fh-numeric px-3 py-2.5 text-right font-semibold text-[var(--text-heading)]">{formatRupiah(Number(order.total))}</td>
                    <td className="fh-numeric px-3 py-2.5 text-[var(--text-body)]">
                      {order.batasBayar?.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" }) ?? "—"}
                    </td>
                    <td className="px-5 py-2.5 text-right">
                      <Link href={`/admin/pesanan/${order.id}`} className="text-[13px] font-semibold text-[var(--text-link)] hover:text-[var(--text-link-hover)]">
                        Lihat pesanan
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="mt-8">
        <h2 className="text-[15px] font-semibold text-[var(--text-heading)]">Riwayat verifikasi</h2>
        {riwayat.length === 0 ? (
          <p className="mt-2 text-sm text-[var(--text-muted)]">Belum ada riwayat.</p>
        ) : (
          <div className="mt-3 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border-default)] bg-[var(--surface-sunken)] text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                  <th className="px-5 py-2.5 font-semibold">Pelanggan</th>
                  <th className="px-3 py-2.5 font-semibold">Metode</th>
                  <th className="px-3 py-2.5 text-right font-semibold">Nominal</th>
                  <th className="px-3 py-2.5 font-semibold">Waktu</th>
                  <th className="px-5 py-2.5 font-semibold">Status</th>
                </tr>
              </thead>
              <tbody>
                {riwayat.map((p, idx) => (
                  <tr key={p.id} className={`border-b border-[var(--border-subtle)] last:border-0 ${idx % 2 === 1 ? "bg-[var(--surface-sunken)]/40" : ""}`}>
                    <td className="px-5 py-2.5 font-medium text-[var(--text-heading)]">
                      <Link href={`/admin/pesanan/${p.orderId}`} className="hover:text-[var(--text-link)]">
                        {p.order.customer.nama}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 capitalize text-[var(--text-body)]">{p.metode === "qris" ? "QRIS" : "Transfer bank"}</td>
                    <td className="fh-numeric px-3 py-2.5 text-right font-semibold text-[var(--text-heading)]">{formatRupiah(Number(p.nominal))}</td>
                    <td className="fh-numeric px-3 py-2.5 text-[var(--text-body)]">
                      {p.waktu.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })}
                    </td>
                    <td className="px-5 py-2.5">
                      <span
                        className="rounded-[var(--radius-badge)] px-2 py-1 text-[11px] font-semibold capitalize"
                        style={
                          p.status === "verified"
                            ? { background: "var(--status-success-bg)", color: "var(--status-success-fg)" }
                            : { background: "var(--status-danger-bg)", color: "var(--status-danger-fg)" }
                        }
                      >
                        {p.status === "verified" ? "Lunas" : "Ditolak"}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
