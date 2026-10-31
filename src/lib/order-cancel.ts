import type { Prisma } from "@prisma/client";
import { stockUnitId, usesUnitStock } from "@/lib/stock-target";

export const ALASAN_BATAL = {
  size_habis: "Size yang dipilih tidak tersedia",
  stok_tidak_cukup: "Stok tidak mencukupi",
  diminta_customer: "Diminta oleh pelanggan",
  lainnya: "Lainnya",
} as const;

export type AlasanBatalKode = keyof typeof ALASAN_BATAL;

export type OrderForCancel = Prisma.OrderGetPayload<{
  include: { items: { include: { saleUnit: true } }; customer: true };
}>;

/**
 * Batalkan pesanan di dalam transaksi: status -> dibatalkan, lepas stok yang ditahan, kembalikan
 * kuota voucher, tulis ActionLog. Dipakai tombol manual (admin) dan cron pembatalan otomatis.
 * Mengembalikan false kalau status pesanan sudah berubah di antara pembacaan dan transaksi
 * (mis. dikonfirmasi atau dibatalkan orang lain) — dalam kasus itu tidak ada yang diubah.
 */
export async function cancelOrderInTx(
  tx: Prisma.TransactionClient,
  order: OrderForCancel,
  opts: { aksi: string; alasan: string; actorId: string | null },
) {
  const updated = await tx.order.updateMany({
    where: { id: order.id, status: order.status },
    data: { status: "dibatalkan" },
  });
  if (updated.count === 0) return false;

  for (const item of order.items) {
    const qty = Number(item.qty);
    if (usesUnitStock(item.saleUnit)) {
      const row = await tx.saleUnitStock.findUnique({ where: { saleUnitId: stockUnitId(item.saleUnit) } });
      // Jangan sampai ditahan jadi negatif kalau tahanannya sudah pernah dibersihkan.
      const dec = Math.min(qty, Number(row?.ditahan ?? 0));
      if (dec > 0) await tx.saleUnitStock.update({ where: { saleUnitId: stockUnitId(item.saleUnit) }, data: { ditahan: { decrement: dec } } });
    } else {
      const row = await tx.stock.findUnique({ where: { productId: item.saleUnit.productId } });
      const dec = Math.min(qty, Number(row?.ditahan ?? 0));
      if (dec > 0) await tx.stock.update({ where: { productId: item.saleUnit.productId }, data: { ditahan: { decrement: dec } } });
    }
  }

  await tx.voucherUsage.deleteMany({ where: { orderId: order.id } });

  await tx.actionLog.create({
    data: {
      entitas: "order",
      entitasId: order.id,
      actorId: opts.actorId,
      aksi: opts.aksi,
      nilaiLama: { status: order.status },
      nilaiBaru: { status: "dibatalkan", alasan: opts.alasan },
    },
  });
  return true;
}

export function pesanBatalWa(nama: string, alasan: string) {
  return `Halo ${nama}, mohon maaf pesanan Farmhill Store kamu kami batalkan.\nAlasan: ${alasan}.\nStok sudah dilepas — silakan pesan ulang atau hubungi kami kalau butuh bantuan.`;
}
