"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { resolveVoucherDiscount } from "@/lib/voucher";

const schema = z.object({ kode: z.string().min(1), subtotal: z.number().min(0) });

/** Preview diskon voucher di halaman checkout — publik, tanpa login. Validasi final tetap diulang di createOrder. */
export async function previewVoucher(input: z.infer<typeof schema>) {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Data tidak valid." };

  const result = await resolveVoucherDiscount(db, parsed.data.kode, parsed.data.subtotal);
  return result;
}
