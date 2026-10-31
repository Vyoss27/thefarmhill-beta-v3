"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { createAdminClient } from "@/lib/supabase/admin";

const ALLOWED_TYPES = ["image/png", "image/jpeg", "image/webp"];
const MAX_SIZE = 5 * 1024 * 1024;

const schema = z.object({
  orderId: z.string().uuid(),
  metode: z.enum(["transfer_manual", "qris"]),
});

/** Pelanggan upload bukti bayar — tidak perlu login, cukup tahu id pesanan (BR-04 alur). */
export async function submitPaymentProof(formData: FormData) {
  const parsed = schema.safeParse({
    orderId: formData.get("orderId"),
    metode: formData.get("metode"),
  });
  if (!parsed.success) return { ok: false as const, error: "Data tidak valid." };
  const { orderId, metode } = parsed.data;

  const file = formData.get("bukti");
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false as const, error: "Pilih file bukti transfer dulu." };
  }
  if (!ALLOWED_TYPES.includes(file.type)) {
    return { ok: false as const, error: "Format file harus JPG, PNG, atau WebP." };
  }
  if (file.size > MAX_SIZE) {
    return { ok: false as const, error: "Ukuran file maksimal 5MB." };
  }

  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return { ok: false as const, error: "Pesanan tidak ditemukan." };
  if (order.status !== "menunggu_bayar") {
    return { ok: false as const, error: "Pesanan ini tidak sedang menunggu pembayaran." };
  }

  const existingPending = await db.payment.findFirst({ where: { orderId, status: "pending" } });
  if (existingPending) {
    return { ok: false as const, error: "Bukti transfer untuk pesanan ini masih menunggu diverifikasi sales." };
  }

  const ext = file.name.split(".").pop() || "jpg";
  const path = `${orderId}/${Date.now()}.${ext}`;
  const supabase = createAdminClient();
  const { error: uploadError } = await supabase.storage
    .from("bukti-pembayaran")
    .upload(path, file, { contentType: file.type });
  if (uploadError) return { ok: false as const, error: "Gagal upload bukti, coba lagi." };

  await db.payment.create({
    data: { orderId, metode, nominal: order.total, buktiUrl: path, status: "pending" },
  });

  revalidatePath(`/pesanan/${orderId}`);
  revalidatePath(`/admin/pesanan/${orderId}`);

  return { ok: true as const };
}
