"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentStaff } from "@/lib/auth";
import { sendWhatsApp } from "@/lib/whatsapp";
import { ALASAN_BATAL, cancelOrderInTx, pesanBatalWa } from "@/lib/order-cancel";

const schema = z.object({
  orderId: z.string().uuid(),
  alasan: z.enum(["size_habis", "stok_tidak_cukup", "diminta_customer", "lainnya"]),
  catatan: z.string().trim().max(200).optional(),
});

/**
 * Batalkan pesanan yang belum dibayar (menunggu konfirmasi atau menunggu bayar): stok yang
 * ditahan dilepas, voucher dikembalikan, pelanggan dikabari lewat WhatsApp beserta alasannya.
 * Beda dengan "kedaluwarsa" (expire-order.ts), ini keputusan tim — mis. size habis setelah dicek gudang.
 */
export async function cancelOrder(input: z.infer<typeof schema>) {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false as const, error: "Sesi login habis, silakan masuk lagi." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Data tidak valid." };
  const { orderId, alasan, catatan } = parsed.data;
  if (alasan === "lainnya" && !catatan) return { ok: false as const, error: "Tulis alasan pembatalan." };

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { saleUnit: true } }, customer: true, payments: true },
  });
  if (!order) return { ok: false as const, error: "Pesanan tidak ditemukan." };
  if (order.status !== "menunggu_konfirmasi" && order.status !== "menunggu_bayar") {
    return { ok: false as const, error: "Hanya pesanan yang belum dibayar (menunggu konfirmasi / menunggu bayar) yang bisa dibatalkan." };
  }
  if (order.payments.some((p) => p.status === "pending" || p.status === "verified")) {
    return { ok: false as const, error: "Pesanan ini sudah punya pembayaran masuk — selesaikan verifikasi pembayarannya dulu." };
  }

  const alasanTeks = alasan === "lainnya" ? catatan! : `${ALASAN_BATAL[alasan]}${catatan ? ` — ${catatan}` : ""}`;

  const done = await db.$transaction((tx) =>
    cancelOrderInTx(tx, order, { aksi: "dibatalkan_manual", alasan: alasanTeks, actorId: staff.id }),
  );
  if (!done) return { ok: false as const, error: "Status pesanan baru saja berubah — muat ulang halaman." };

  revalidatePath("/admin");
  revalidatePath("/admin/pesanan");
  revalidatePath(`/admin/pesanan/${orderId}`);

  await sendWhatsApp(order.customer.wa, pesanBatalWa(order.customer.nama, alasanTeks));

  return { ok: true as const };
}
