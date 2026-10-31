"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentStaff } from "@/lib/auth";

async function requireAdmin() {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false as const, error: "Sesi login habis, silakan masuk lagi." };
  if (staff.role !== "admin") return { ok: false as const, error: "Cuma admin yang bisa mengelola voucher." };
  return { ok: true as const, staff };
}

const voucherFields = {
  kode: z
    .string()
    .min(3, "Kode minimal 3 karakter")
    .max(20, "Kode maksimal 20 karakter")
    .transform((s) => s.toUpperCase().trim()),
  tipe: z.enum(["nominal", "persen"]),
  nilai: z.coerce.number().positive("Nilai harus lebih dari 0"),
  kuota: z.coerce.number().int().min(1).optional(),
  minimalBelanja: z.coerce.number().min(0).optional(),
  mulai: z.string().optional(),
  berakhir: z.string().optional(),
};

const createSchema = z.object(voucherFields).refine((v) => v.tipe !== "persen" || v.nilai <= 100, {
  message: "Voucher persen maksimal 100%",
  path: ["nilai"],
});

export async function createVoucher(input: z.infer<typeof createSchema>) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  const data = parsed.data;

  const existing = await db.voucher.findUnique({ where: { kode: data.kode } });
  if (existing) return { ok: false as const, error: "Kode voucher ini sudah dipakai." };

  if (data.mulai && data.berakhir && new Date(data.berakhir) < new Date(data.mulai)) {
    return { ok: false as const, error: "Tanggal berakhir tidak boleh sebelum tanggal mulai." };
  }

  const voucher = await db.voucher.create({
    data: {
      kode: data.kode,
      tipe: data.tipe,
      nilai: data.nilai,
      kuota: data.kuota ?? null,
      minimalBelanja: data.minimalBelanja ?? null,
      mulai: data.mulai ? new Date(data.mulai) : null,
      berakhir: data.berakhir ? new Date(data.berakhir) : null,
    },
  });

  await db.actionLog.create({
    data: { entitas: "voucher", entitasId: voucher.id, actorId: auth.staff.id, aksi: "buat_voucher", nilaiBaru: data },
  });

  revalidatePath("/admin/voucher");
  return { ok: true as const };
}

const updateSchema = z.object({ id: z.string().uuid(), ...voucherFields }).refine((v) => v.tipe !== "persen" || v.nilai <= 100, {
  message: "Voucher persen maksimal 100%",
  path: ["nilai"],
});

export async function updateVoucher(input: z.infer<typeof updateSchema>) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  const { id, ...data } = parsed.data;

  const before = await db.voucher.findUnique({ where: { id } });
  if (!before) return { ok: false as const, error: "Voucher tidak ditemukan." };

  const dupe = await db.voucher.findFirst({ where: { kode: data.kode, NOT: { id } } });
  if (dupe) return { ok: false as const, error: "Kode voucher ini sudah dipakai voucher lain." };

  if (data.mulai && data.berakhir && new Date(data.berakhir) < new Date(data.mulai)) {
    return { ok: false as const, error: "Tanggal berakhir tidak boleh sebelum tanggal mulai." };
  }

  await db.voucher.update({
    where: { id },
    data: {
      kode: data.kode,
      tipe: data.tipe,
      nilai: data.nilai,
      kuota: data.kuota ?? null,
      minimalBelanja: data.minimalBelanja ?? null,
      mulai: data.mulai ? new Date(data.mulai) : null,
      berakhir: data.berakhir ? new Date(data.berakhir) : null,
    },
  });

  await db.actionLog.create({
    data: {
      entitas: "voucher",
      entitasId: id,
      actorId: auth.staff.id,
      aksi: "ubah_voucher",
      nilaiLama: { kode: before.kode, tipe: before.tipe, nilai: before.nilai.toString() },
      nilaiBaru: data,
    },
  });

  revalidatePath("/admin/voucher");
  return { ok: true as const };
}

export async function deleteVoucher(id: string) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const before = await db.voucher.findUnique({ where: { id }, include: { _count: { select: { usages: true } } } });
  if (!before) return { ok: false as const, error: "Voucher tidak ditemukan." };
  if (before._count.usages > 0) {
    return { ok: false as const, error: "Voucher ini sudah pernah dipakai pelanggan, tidak bisa dihapus — matikan dengan set tanggal berakhir ke hari ini." };
  }

  await db.voucher.delete({ where: { id } });

  await db.actionLog.create({
    data: { entitas: "voucher", entitasId: id, actorId: auth.staff.id, aksi: "hapus_voucher", nilaiLama: { kode: before.kode } },
  });

  revalidatePath("/admin/voucher");
  return { ok: true as const };
}
