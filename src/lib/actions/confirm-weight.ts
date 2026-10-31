"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentStaff } from "@/lib/auth";

const schema = z.object({
  orderId: z.string().uuid(),
  items: z.array(z.object({ orderItemId: z.string().uuid(), beratAktual: z.coerce.number().positive("Berat harus lebih dari 0") })).min(1),
});

/**
 * Sales input berat aktual (kg) hasil timbangan untuk item yang dijual per-ukuran
 * (mis. melon per size — lihat SaleUnit.ukuran). Subtotal order dihitung ulang
 * dari berat aktual × harga/kg, menggantikan estimasi Rp0 di checkout. Ini
 * langkah wajib sebelum "Konfirmasi & tetapkan ongkir" untuk order yang punya
 * item semacam ini — begitu selesai, WA konfirmasi (dikirim di step ongkir)
 * otomatis bawa total yang sudah benar, tanpa perlu chat manual bolak-balik.
 */
export async function saveBeratAktual(input: z.infer<typeof schema>) {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false as const, error: "Sesi login habis, silakan masuk lagi." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  const { orderId, items } = parsed.data;

  const order = await db.order.findUnique({ where: { id: orderId }, include: { items: true } });
  if (!order) return { ok: false as const, error: "Pesanan tidak ditemukan." };
  if (order.status !== "menunggu_konfirmasi") {
    return { ok: false as const, error: "Pesanan ini sudah diproses sebelumnya." };
  }

  await db.$transaction(async (tx) => {
    for (const item of items) {
      await tx.orderItem.update({ where: { id: item.orderItemId }, data: { beratAktual: item.beratAktual } });
    }

    const updatedItems = await tx.orderItem.findMany({ where: { orderId }, include: { saleUnit: true } });
    const subtotal = updatedItems.reduce((sum, i) => {
      if (i.saleUnit.ukuran) {
        return sum + (i.beratAktual ? Number(i.beratAktual) * Number(i.hargaSaatPesan) : 0);
      }
      return sum + Number(i.qty) * Number(i.hargaSaatPesan);
    }, 0);

    await tx.order.update({ where: { id: orderId }, data: { subtotal, total: subtotal - Number(order.diskon) } });

    await tx.actionLog.create({
      data: {
        entitas: "order",
        entitasId: orderId,
        actorId: staff.id,
        aksi: "berat_aktual_diisi",
        nilaiBaru: { items, subtotalBaru: subtotal },
      },
    });
  });

  revalidatePath(`/admin/pesanan/${orderId}`);
  return { ok: true as const };
}
