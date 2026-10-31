import type { Prisma, PrismaClient } from "@prisma/client";

type DbClient = PrismaClient | Prisma.TransactionClient;

export type VoucherCheckResult =
  | { ok: true; voucherId: string; kode: string; diskon: number }
  | { ok: false; error: string };

/**
 * Validasi kode voucher terhadap subtotal saat ini & hitung nominal diskonnya.
 * Dipakai baik untuk preview di checkout (client belum tentu order valid)
 * maupun sebagai pengecekan otoritatif di dalam transaksi createOrder —
 * jangan pernah percaya diskon yang dihitung di client.
 */
export async function resolveVoucherDiscount(db: DbClient, kodeInput: string, subtotal: number): Promise<VoucherCheckResult> {
  const kode = kodeInput.trim().toUpperCase();
  if (!kode) return { ok: false, error: "Kode voucher kosong." };

  const voucher = await db.voucher.findUnique({ where: { kode } });
  if (!voucher) return { ok: false, error: "Kode voucher tidak ditemukan." };

  const now = new Date();
  if (voucher.mulai && now < voucher.mulai) {
    return { ok: false, error: "Voucher ini belum mulai berlaku." };
  }
  if (voucher.berakhir && now > voucher.berakhir) {
    return { ok: false, error: "Voucher ini sudah berakhir." };
  }

  if (voucher.minimalBelanja && subtotal < Number(voucher.minimalBelanja)) {
    return { ok: false, error: `Minimal belanja untuk voucher ini Rp${Number(voucher.minimalBelanja).toLocaleString("id-ID")}.` };
  }

  if (voucher.kuota !== null) {
    const usageCount = await db.voucherUsage.count({ where: { voucherId: voucher.id } });
    if (usageCount >= voucher.kuota) {
      return { ok: false, error: "Kuota voucher ini sudah habis." };
    }
  }

  const rawDiskon = voucher.tipe === "persen" ? (subtotal * Number(voucher.nilai)) / 100 : Number(voucher.nilai);
  const diskon = Math.min(Math.round(rawDiskon), subtotal);

  return { ok: true, voucherId: voucher.id, kode: voucher.kode, diskon };
}
