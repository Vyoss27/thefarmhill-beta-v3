"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentStaff } from "@/lib/auth";
import { sendWhatsApp } from "@/lib/whatsapp";

const schema = z.object({ paymentId: z.string().uuid() });

/** Sales verifikasi bukti transfer yang diupload pelanggan -> pesanan lanjut diproses. */
export async function confirmPayment(input: z.infer<typeof schema>) {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false as const, error: "Sesi login habis, silakan masuk lagi." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Data tidak valid." };

  const payment = await db.payment.findUnique({ where: { id: parsed.data.paymentId }, include: { order: { include: { customer: true } } } });
  if (!payment) return { ok: false as const, error: "Bukti bayar tidak ditemukan." };
  if (payment.status !== "pending") return { ok: false as const, error: "Bukti bayar ini sudah diproses." };
  if (payment.order.status !== "menunggu_bayar") return { ok: false as const, error: "Pesanan ini sudah bukan status menunggu bayar." };

  await db.$transaction([
    db.payment.update({ where: { id: payment.id }, data: { status: "verified", verifikatorId: staff.id } }),
    db.order.update({ where: { id: payment.orderId }, data: { status: "diproses" } }),
    db.actionLog.create({
      data: {
        entitas: "order",
        entitasId: payment.orderId,
        actorId: staff.id,
        aksi: "pembayaran_diverifikasi",
        nilaiLama: { status: "menunggu_bayar" },
        nilaiBaru: { status: "diproses", paymentId: payment.id },
      },
    }),
  ]);

  revalidatePath("/admin/pesanan");
  revalidatePath(`/admin/pesanan/${payment.orderId}`);
  revalidatePath(`/pesanan/${payment.orderId}`);

  await sendWhatsApp(
    payment.order.customer.wa,
    `Halo ${payment.order.customer.nama}, pembayaran pesananmu di Farmhill Store sudah kami terima dan verifikasi. Pesanan sekarang sedang diproses/dikemas. Terima kasih!`
  );

  return { ok: true as const };
}

const rejectSchema = z.object({ paymentId: z.string().uuid(), alasan: z.string().min(3).optional() });

/** Bukti bayar tidak valid/tidak sesuai -> pelanggan diminta upload ulang. */
export async function rejectPayment(input: z.infer<typeof rejectSchema>) {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false as const, error: "Sesi login habis, silakan masuk lagi." };

  const parsed = rejectSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Data tidak valid." };

  const payment = await db.payment.findUnique({ where: { id: parsed.data.paymentId }, include: { order: { include: { customer: true } } } });
  if (!payment) return { ok: false as const, error: "Bukti bayar tidak ditemukan." };
  if (payment.status !== "pending") return { ok: false as const, error: "Bukti bayar ini sudah diproses." };

  // Bukti ditolak tidak boleh diam-diam membuat pelanggan kehabisan waktu — kalau
  // sisa batas bayar kurang dari 2 jam saat ditolak, beri tenggang +2 jam dari
  // sekarang. Tidak reset penuh ke 24 jam supaya tidak bisa disalahgunakan buat
  // perpanjang berkali-kali dengan upload bukti asal.
  const GRACE_MS = 2 * 60 * 60 * 1000;
  const now = new Date();
  const sisaWaktu = payment.order.batasBayar ? payment.order.batasBayar.getTime() - now.getTime() : 0;
  const batasBayarBaru = sisaWaktu < GRACE_MS ? new Date(now.getTime() + GRACE_MS) : null;

  await db.$transaction([
    db.payment.update({ where: { id: payment.id }, data: { status: "rejected", verifikatorId: staff.id } }),
    ...(batasBayarBaru ? [db.order.update({ where: { id: payment.orderId }, data: { batasBayar: batasBayarBaru } })] : []),
    db.actionLog.create({
      data: {
        entitas: "order",
        entitasId: payment.orderId,
        actorId: staff.id,
        aksi: "pembayaran_ditolak",
        nilaiLama: { paymentStatus: "pending", batasBayar: payment.order.batasBayar?.toISOString() ?? null },
        nilaiBaru: { paymentStatus: "rejected", alasan: parsed.data.alasan ?? null, batasBayarBaru: batasBayarBaru?.toISOString() ?? null },
      },
    }),
  ]);

  revalidatePath(`/admin/pesanan/${payment.orderId}`);
  revalidatePath(`/pesanan/${payment.orderId}`);

  const tenggangNote = batasBayarBaru
    ? ` Batas bayar diperpanjang sampai ${batasBayarBaru.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })}.`
    : "";
  await sendWhatsApp(
    payment.order.customer.wa,
    `Halo ${payment.order.customer.nama}, bukti transfer untuk pesananmu di Farmhill Store belum bisa kami verifikasi${parsed.data.alasan ? ` (${parsed.data.alasan})` : ""}. Silakan upload ulang bukti transfer yang jelas di halaman lacak pesanan.${tenggangNote}`
  );

  return { ok: true as const };
}
