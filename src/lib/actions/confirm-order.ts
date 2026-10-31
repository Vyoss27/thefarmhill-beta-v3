"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentStaff } from "@/lib/auth";
import { sendWhatsApp, sendWhatsAppDocument } from "@/lib/whatsapp";
import { formatRupiah } from "@/lib/catalog";
import { generateAndUploadInvoicePdf } from "@/lib/invoice-pdf";

const schema = z.object({
  orderId: z.string().uuid(),
  ongkir: z.number().min(0),
  diskon: z.number().min(0).default(0),
});

export async function confirmOrder(input: z.infer<typeof schema>) {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false as const, error: "Sesi login habis, silakan masuk lagi." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  const { orderId, ongkir, diskon } = parsed.data;

  const order = await db.order.findUnique({ where: { id: orderId }, include: { customer: true } });
  if (!order) return { ok: false as const, error: "Pesanan tidak ditemukan." };
  if (order.status !== "menunggu_konfirmasi") {
    return { ok: false as const, error: "Pesanan ini sudah diproses sebelumnya." };
  }

  const total = Number(order.subtotal) - diskon + ongkir;
  const batasBayar = new Date(Date.now() + 24 * 60 * 60 * 1000);

  await db.$transaction([
    db.order.update({
      where: { id: orderId },
      data: { ongkir, diskon, total, status: "menunggu_bayar", batasBayar, salesId: staff.id },
    }),
    db.actionLog.create({
      data: {
        entitas: "order",
        entitasId: orderId,
        actorId: staff.id,
        aksi: "ongkir_ditetapkan",
        nilaiLama: { status: "menunggu_konfirmasi" },
        nilaiBaru: { status: "menunggu_bayar", ongkir, diskon, total },
      },
    }),
  ]);

  revalidatePath("/admin");
  revalidatePath(`/admin/pesanan/${orderId}`);

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const pesanKonfirmasi = `Halo ${order.customer.nama}, pesananmu di Farmhill Store sudah dikonfirmasi!\nOngkir: ${formatRupiah(ongkir)}\nTotal tagihan: ${formatRupiah(total)}\nBayar sebelum ${batasBayar.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })}.\nCek & bayar di: ${appUrl}/pesanan/${orderId}`;

  // Kirim invoice PDF asli sebagai lampiran — kalau gagal (mis. storage/PDF
  // error), tetap kirim pesan teks biasa dengan link supaya notifikasi tidak
  // hilang sama sekali cuma karena PDF gagal dibuat.
  let invoiceSent = false;
  try {
    const invoice = await generateAndUploadInvoicePdf(orderId);
    if (invoice) {
      const result = await sendWhatsAppDocument(
        order.customer.wa,
        pesanKonfirmasi,
        invoice.url,
        `Invoice-${orderId.slice(0, 8).toUpperCase()}.pdf`
      );
      invoiceSent = result.ok;
    }
  } catch (err) {
    console.error("Gagal generate/kirim invoice PDF:", err);
  }

  if (!invoiceSent) {
    await sendWhatsApp(order.customer.wa, `${pesanKonfirmasi}\nInvoice: ${appUrl}/pesanan/${orderId}/invoice`);
  }

  return { ok: true as const };
}
