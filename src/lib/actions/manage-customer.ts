"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentStaff } from "@/lib/auth";

async function requireAdmin() {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false as const, error: "Sesi login habis, silakan masuk lagi." };
  if (staff.role !== "admin") return { ok: false as const, error: "Cuma admin yang bisa mengelola data pelanggan." };
  return { ok: true as const, staff };
}

const updateSchema = z.object({
  customerId: z.string().uuid(),
  nama: z.string().min(2, "Nama minimal 2 karakter"),
  wa: z.string().min(8, "Nomor WhatsApp tidak valid"),
  email: z.string().email("Email tidak valid").optional().or(z.literal("")),
  alamat: z.string().optional(),
  segmen: z.enum(["rumah_tangga", "kafe", "reseller"]).optional().or(z.literal("")),
});

export async function updateCustomer(input: z.infer<typeof updateSchema>) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const parsed = updateSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Data tidak valid." };
  const { customerId, nama, wa, email, alamat, segmen } = parsed.data;

  const before = await db.customer.findUnique({ where: { id: customerId } });
  if (!before) return { ok: false as const, error: "Pelanggan tidak ditemukan." };

  const waTaken = await db.customer.findFirst({ where: { wa, NOT: { id: customerId } } });
  if (waTaken) return { ok: false as const, error: "Nomor WhatsApp ini sudah dipakai pelanggan lain." };

  if (email) {
    const emailTaken = await db.customer.findFirst({ where: { email, NOT: { id: customerId } } });
    if (emailTaken) return { ok: false as const, error: "Email ini sudah dipakai pelanggan lain." };
  }

  await db.customer.update({
    where: { id: customerId },
    data: {
      nama,
      wa,
      email: email || null,
      alamat: alamat || null,
      segmen: segmen || null,
    },
  });

  await db.actionLog.create({
    data: {
      entitas: "customer",
      entitasId: customerId,
      actorId: auth.staff.id,
      aksi: "ubah_data_pelanggan",
      nilaiLama: { nama: before.nama, wa: before.wa, email: before.email, alamat: before.alamat, segmen: before.segmen },
      nilaiBaru: { nama, wa, email: email || null, alamat: alamat || null, segmen: segmen || null },
    },
  });

  revalidatePath("/admin/pelanggan");
  return { ok: true as const };
}
