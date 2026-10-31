"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentStaff } from "@/lib/auth";
import { getDrivingDistanceKm, calculateOngkir } from "@/lib/google-maps";

const schema = z.object({ orderId: z.string().uuid() });

/** Hitung estimasi ongkir dari jarak Google Maps — sales masih bisa timpa manual. */
export async function estimateOngkir(input: z.infer<typeof schema>) {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false as const, error: "Sesi login habis, silakan masuk lagi." };

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Data tidak valid." };

  const order = await db.order.findUnique({ where: { id: parsed.data.orderId }, include: { customer: true } });
  if (!order) return { ok: false as const, error: "Pesanan tidak ditemukan." };
  if (order.metodeTerima === "ambil_sendiri") {
    return { ok: false as const, error: "Pesanan ini diambil sendiri — tidak perlu ongkir." };
  }
  if (!order.customer.alamat) return { ok: false as const, error: "Pelanggan belum isi alamat." };

  const distance = await getDrivingDistanceKm(order.customer.alamat);
  if (!distance.ok) return { ok: false as const, error: distance.error };

  const ongkir = calculateOngkir(distance.km);
  return { ok: true as const, km: distance.km, ongkir };
}
