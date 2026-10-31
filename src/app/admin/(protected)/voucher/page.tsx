import { db } from "@/lib/db";
import AddVoucherForm from "./AddVoucherForm";
import VoucherRow from "./VoucherRow";

export default async function AdminVoucherPage() {
  const vouchers = await db.voucher.findMany({ orderBy: { createdAt: "desc" } });

  return (
    <div>
      <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-subtle)]">
        Panel admin
      </span>
      <h1 className="mt-1 font-serif text-[28px] font-semibold tracking-[-0.01em] text-[var(--text-heading)]">
        Diskon &amp; Voucher
      </h1>
      <p className="mt-1.5 text-[15px] text-[var(--text-muted)]">
        Buat kode voucher, atur nilai potongan, kuota, dan masa aktifnya. Voucher otomatis tidak berlaku lagi setelah
        tanggal berakhir.
      </p>

      <div className="mt-4">
        <AddVoucherForm />
      </div>

      <div className="mt-5 overflow-hidden rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)]">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border-default)] bg-[var(--surface-sunken)] text-left text-[11px] uppercase tracking-wide text-[var(--text-muted)]">
                <th className="px-5 py-2.5 font-semibold">Kode</th>
                <th className="px-3 py-2.5 font-semibold">Tipe</th>
                <th className="px-3 py-2.5 text-right font-semibold">Nilai</th>
                <th className="px-3 py-2.5 text-right font-semibold">Kuota</th>
                <th className="px-5 py-2.5 font-semibold">Masa aktif</th>
                <th className="px-3 py-2.5" />
              </tr>
            </thead>
            <tbody>
              {vouchers.map((v, idx) => (
                <VoucherRow
                  key={v.id}
                  zebra={idx % 2 === 1}
                  voucher={{
                    id: v.id,
                    kode: v.kode,
                    tipe: v.tipe,
                    nilai: v.nilai.toString(),
                    kuota: v.kuota,
                    minimalBelanja: v.minimalBelanja ? v.minimalBelanja.toString() : null,
                    mulai: v.mulai,
                    berakhir: v.berakhir,
                  }}
                />
              ))}
              {vouchers.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-5 py-8 text-center text-[var(--text-muted)]">
                    Belum ada voucher dibuat.
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
