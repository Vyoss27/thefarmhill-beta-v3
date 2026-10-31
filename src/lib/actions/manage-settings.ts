"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentStaff } from "@/lib/auth";

async function requireAdmin() {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false as const, error: "Sesi login habis, silakan masuk lagi." };
  if (staff.role !== "admin") return { ok: false as const, error: "Cuma admin yang bisa mengelola pengaturan toko." };
  return { ok: true as const, staff };
}

const bankSchema = z.object({
  nama: z.string().min(1, "Nama bank wajib diisi"),
  noRekening: z.string().min(1, "Nomor rekening wajib diisi"),
  atasNama: z.string().min(1, "Atas nama wajib diisi"),
});

const schema = z.object({
  namaGudang: z.string().min(1, "Nama gudang wajib diisi"),
  alamatGudang: z.string().min(1, "Alamat wajib diisi"),
  banks: z.array(bankSchema),
});

export async function updateStoreSetting(input: z.infer<typeof schema>) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  const data = parsed.data;

  const before = await db.storeSetting.findUnique({ where: { id: "default" } });

  await db.storeSetting.upsert({
    where: { id: "default" },
    update: { namaGudang: data.namaGudang, alamatGudang: data.alamatGudang, banks: data.banks },
    create: { id: "default", namaGudang: data.namaGudang, alamatGudang: data.alamatGudang, banks: data.banks },
  });

  await db.actionLog.create({
    data: {
      entitas: "store_setting",
      entitasId: "00000000-0000-0000-0000-000000000000",
      actorId: auth.staff.id,
      aksi: "ubah_pengaturan_toko",
      nilaiLama: before
        ? { namaGudang: before.namaGudang, alamatGudang: before.alamatGudang, banks: before.banks as unknown as object }
        : undefined,
      nilaiBaru: { namaGudang: data.namaGudang, alamatGudang: data.alamatGudang, banks: data.banks },
    },
  });

  revalidatePath("/admin/pengaturan");
  revalidatePath("/pesanan", "layout");
  return { ok: true as const };
}
