import { BadgePercent } from "lucide-react";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/catalog";
import CopyKodeButton from "./CopyKodeButton";

export default async function PromoPage() {
  const today = new Date();
  const todayDateOnly = new Date(`${today.toISOString().slice(0, 10)}T00:00:00Z`);

  const vouchers = await db.voucher.findMany({
    where: {
      AND: [
        { OR: [{ mulai: null }, { mulai: { lte: todayDateOnly } }] },
        { OR: [{ berakhir: null }, { berakhir: { gte: todayDateOnly } }] },
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-serif text-[28px] font-semibold tracking-[-0.01em] text-[var(--text-heading)]">Promo</h1>
      <p className="mt-1.5 text-[15px] text-[var(--text-muted)]">Pakai kode di bawah pas checkout.</p>

      {vouchers.length === 0 ? (
        <div className="mt-6 flex flex-col items-center gap-2.5 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] px-4 py-10 text-center">
          <BadgePercent size={28} strokeWidth={1.5} className="text-[var(--text-subtle)]" />
          <p className="text-sm text-[var(--text-muted)]">Belum ada promo aktif saat ini.</p>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-3">
          {vouchers.map((v) => {
            const diskonLabel = v.tipe === "persen" ? `${Number(v.nilai)}%` : formatRupiah(Number(v.nilai));
            return (
              <div key={v.id} className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-serif text-[18px] font-semibold text-[var(--text-heading)]">Diskon {diskonLabel}</p>
                    {v.minimalBelanja && (
                      <p className="mt-0.5 text-[13px] text-[var(--text-muted)]">
                        Min. belanja {formatRupiah(Number(v.minimalBelanja))}
                      </p>
                    )}
                    {v.berakhir && (
                      <p className="mt-0.5 text-[12px] text-[var(--text-subtle)]">
                        Berlaku sampai {v.berakhir.toLocaleDateString("id-ID", { dateStyle: "medium", timeZone: "UTC" })}
                      </p>
                    )}
                  </div>
                  <CopyKodeButton kode={v.kode} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
