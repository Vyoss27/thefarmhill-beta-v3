"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentCustomer } from "@/lib/customer-auth";

const schema = z.object({ productId: z.string().uuid() });

/** BR-06: pelanggan minta dikabari waktu produk yang lagi habis balik ada stok. */
export async function joinWaitlist(input: z.infer<typeof schema>) {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false as const, error: "login_required" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Data tidak valid." };

  await db.waitlist.upsert({
    where: { productId_customerId: { productId: parsed.data.productId, customerId: customer.id } },
    update: {},
    create: { productId: parsed.data.productId, customerId: customer.id },
  });

  revalidatePath("/akun/diingatkan");
  return { ok: true as const };
}

export async function leaveWaitlist(input: z.infer<typeof schema>) {
  const customer = await getCurrentCustomer();
  if (!customer) return { ok: false as const, error: "login_required" };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Data tidak valid." };

  await db.waitlist.deleteMany({ where: { productId: parsed.data.productId, customerId: customer.id } });

  revalidatePath("/akun/diingatkan");
  return { ok: true as const };
}
