"use server";

import { z } from "zod";
import { getCurrentCustomer } from "@/lib/customer-auth";
import { sendWhatsApp } from "@/lib/whatsapp";

const schema = z.object({ saran: z.string().min(3, "Ceritain dulu produk apa yang kamu mau") });

/** Forward saran produk pelanggan ke admin lewat WA — gak ada tabel DB khusus, cuma notifikasi. */
export async function suggestProduct(input: z.infer<typeof schema>) {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false as const, error: "login_required" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };

  const adminWa = process.env.ADMIN_WHATSAPP_NUMBER;
  if (adminWa) {
    await sendWhatsApp(
      adminWa,
      `Saran produk dari ${customer.nama} (${customer.wa}):\n${parsed.data.saran}`
    );
  }

  return { ok: true as const };
}
