"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentStaff } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const addSchema = z.object({
  nama: z.string().min(2, "Nama minimal 2 karakter"),
  email: z.string().email("Email tidak valid"),
  role: z.enum(["admin", "sales"]),
});

/** Admin undang staf baru: bikin akun Supabase Auth (invite email) + baris User. */
export async function addStaff(input: z.infer<typeof addSchema>) {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false as const, error: "Sesi login habis, silakan masuk lagi." };
  if (staff.role !== "admin") return { ok: false as const, error: "Cuma admin yang bisa mengelola akun staf." };

  const parsed = addSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  const { nama, email, role } = parsed.data;

  const existing = await db.user.findUnique({ where: { kontak: email } });
  if (existing) return { ok: false as const, error: "Email ini sudah terdaftar sebagai staf." };

  const supabase = createAdminClient();
  const { error: inviteError } = await supabase.auth.admin.inviteUserByEmail(email);
  if (inviteError && !inviteError.message.includes("already been registered")) {
    return { ok: false as const, error: `Gagal kirim undangan: ${inviteError.message}` };
  }

  await db.user.create({ data: { nama, kontak: email, role } });

  revalidatePath("/admin/pengaturan");
  return { ok: true as const };
}

const toggleSchema = z.object({ userId: z.string().uuid(), aktif: z.boolean() });

/** Admin nonaktifkan/aktifkan akun staf — tidak menghapus riwayat (ActionLog, Order.salesId, dll). */
export async function toggleStaffActive(input: z.infer<typeof toggleSchema>) {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false as const, error: "Sesi login habis, silakan masuk lagi." };
  if (staff.role !== "admin") return { ok: false as const, error: "Cuma admin yang bisa mengelola akun staf." };

  const parsed = toggleSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Data tidak valid." };

  if (parsed.data.userId === staff.id && !parsed.data.aktif) {
    return { ok: false as const, error: "Tidak bisa menonaktifkan akun sendiri." };
  }

  await db.user.update({ where: { id: parsed.data.userId }, data: { aktif: parsed.data.aktif } });

  revalidatePath("/admin/pengaturan");
  return { ok: true as const };
}
