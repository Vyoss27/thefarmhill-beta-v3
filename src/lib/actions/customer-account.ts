"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

const signUpSchema = z.object({
  nama: z.string().min(2, "Nama minimal 2 karakter"),
  wa: z.string().min(8, "Nomor WhatsApp tidak valid"),
  email: z.string().email("Email tidak valid"),
});

/**
 * Siapkan/hubungkan row Customer sebelum akun Supabase Auth dibuat di sisi
 * client. Kalau nomor WA ini sudah pernah checkout sebagai tamu, riwayat
 * pesanannya otomatis ikut ke akun baru (di-upsert by WA, bukan bikin
 * customer baru).
 */
export async function prepareCustomerSignUp(input: z.infer<typeof signUpSchema>) {
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  const { nama, wa, email } = parsed.data;

  const emailTaken = await db.customer.findUnique({ where: { email } });
  if (emailTaken && emailTaken.wa !== wa) {
    return { ok: false as const, error: "Email ini sudah dipakai akun lain." };
  }

  try {
    await db.customer.upsert({
      where: { wa },
      update: { nama, email },
      create: { nama, wa, email },
    });
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Gagal menyimpan data, coba lagi." };
  }
}

const updateProfileSchema = z.object({
  customerId: z.string().uuid(),
  nama: z.string().min(2, "Nama minimal 2 karakter"),
  wa: z.string().min(8, "Nomor WhatsApp tidak valid"),
  alamat: z.string().optional(),
});

/** Ubah nama, nomor WhatsApp, dan alamat pelanggan yang sedang login. */
export async function updateCustomerProfile(input: z.infer<typeof updateProfileSchema>) {
  const parsed = updateProfileSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  const { customerId, nama, wa, alamat } = parsed.data;

  const waTaken = await db.customer.findUnique({ where: { wa } });
  if (waTaken && waTaken.id !== customerId) {
    return { ok: false as const, error: "Nomor WhatsApp ini sudah dipakai akun lain." };
  }

  try {
    await db.customer.update({
      where: { id: customerId },
      data: { nama, wa, alamat: alamat || null },
    });
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Gagal menyimpan data, coba lagi." };
  }
}

const completeGoogleSchema = z.object({
  nama: z.string().trim().min(2, "Nama minimal 2 karakter"),
  wa: z.string().trim().min(8, "Nomor WhatsApp tidak valid"),
});

/**
 * Lengkapi data pelanggan yang baru masuk lewat Google. Email diambil dari sesi login
 * (bukan dari input) — jadi tidak bisa dipakai untuk mengklaim email orang lain. Kalau nomor
 * WA ini sudah pernah dipakai checkout sebagai tamu, riwayat pesanannya ikut tersambung ke akun ini.
 */
export async function completeGoogleProfile(input: z.infer<typeof completeGoogleSchema>) {
  const parsed = completeGoogleSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  const { nama, wa } = parsed.data;

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user?.email) return { ok: false as const, error: "Sesi login habis, silakan masuk lagi." };
  const email = user.email;

  if (await db.customer.findUnique({ where: { email } })) return { ok: true as const };

  const byWa = await db.customer.findUnique({ where: { wa } });
  if (byWa?.email && byWa.email !== email) {
    return { ok: false as const, error: "Nomor WhatsApp ini sudah dipakai akun lain." };
  }

  try {
    await db.customer.upsert({ where: { wa }, update: { nama, email }, create: { nama, wa, email } });
    return { ok: true as const };
  } catch {
    return { ok: false as const, error: "Gagal menyimpan data, coba lagi." };
  }
}
