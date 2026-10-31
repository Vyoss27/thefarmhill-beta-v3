"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { stockUnitId, usesUnitStock } from "@/lib/stock-target";
import { getCurrentStaff } from "@/lib/auth";
import { sendWhatsApp } from "@/lib/whatsapp";

const schema = z.object({ orderId: z.string().uuid() });

/**
 * Batalkan manual pesanan yang belum dibayar (BR-04) — dipakai admin saat
 * pelanggan tidak ada kabar lebih lanjut, sebagai pengganti auto-expire cron.
 */
export async function expireOrderManually(input: z.infer<typeof schema>) {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false as const, error: "Sesi login habis, silakan masuk lagi." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Data tidak valid." };
  const { orderId } = parsed.data;

  const order = await db.order.findUnique({
    where: { id: orderId },
    include: { items: { include: { saleUnit: true } }, customer: true },
  });
  if (!order) return { ok: false as const, error: "Pesanan tidak ditemukan." };
  if (order.status !== "menunggu_bayar") {
    return { ok: false as const, error: "Hanya pesanan berstatus 'menunggu bayar' yang bisa ditandai kedaluwarsa." };
  }

  await db.$transaction(async (tx) => {
    await tx.order.update({ where: { id: orderId }, data: { status: "kedaluwarsa" } });

    for (const item of order.items) {
      if (usesUnitStock(item.saleUnit)) {
        await tx.saleUnitStock.update({
          where: { saleUnitId: stockUnitId(item.saleUnit) },
          data: { ditahan: { decrement: Number(item.qty) } },
        });
      } else {
        await tx.stock.update({
          where: { productId: item.saleUnit.productId },
          data: { ditahan: { decrement: Number(item.qty) } },
        });
      }
    }

    await tx.actionLog.create({
      data: {
        entitas: "order",
        entitasId: orderId,
        actorId: staff.id,
        aksi: "kedaluwarsa_manual",
        nilaiLama: { status: "menunggu_bayar" },
        nilaiBaru: { status: "kedaluwarsa" },
      },
    });
  });

  revalidatePath("/admin");
  revalidatePath(`/admin/pesanan/${orderId}`);

  await sendWhatsApp(
    order.customer.wa,
    `Halo ${order.customer.nama}, pesanan Farmhill Store kamu ditandai kedaluwarsa karena belum ada pembayaran. Stok sudah dilepas — silakan pesan ulang kalau masih berminat.`
  );

  return { ok: true as const };
}
