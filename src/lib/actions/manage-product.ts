"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { getCurrentStaff } from "@/lib/auth";

const CATEGORY_VALUES = [
  "melon",
  "buah",
  "buah_potong",
  "paket",
  "paket_melon",
  "minuman",
  "kurma",
  "sayur",
  "snack",
  "frozen",
] as const;

function slugSku(nama: string) {
  return nama
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 24);
}

/** BR-07: cuma admin yang boleh ubah data master produk & harga — sales tidak. */
async function requireAdmin() {
  const staff = await getCurrentStaff();
  if (!staff) return { ok: false as const, error: "Sesi login habis, silakan masuk lagi." };
  if (staff.role !== "admin") return { ok: false as const, error: "Cuma admin yang bisa mengelola data produk." };
  return { ok: true as const, staff };
}

const createSchema = z.object({
  nama: z.string().min(2, "Nama minimal 2 karakter"),
  jenisItem: z.enum(CATEGORY_VALUES),
  asalKebun: z.string().optional(),
  deskripsi: z.string().optional(),
  satuan: z.string().min(1, "Satuan wajib diisi"),
  harga: z.coerce.number().min(0, "Harga tidak boleh negatif"),
  minOrder: z.coerce.number().int().min(1).default(1),
  stokAwal: z.coerce.number().min(0).default(0),
  ambangStokTipis: z.coerce.number().min(0).optional(),
  aktifkan: z.coerce.boolean().default(true),
});

export async function createProduct(input: z.infer<typeof createSchema>) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Data tidak valid" };
  const data = parsed.data;

  const baseSku = slugSku(data.nama) || "PRODUK";
  let sku = baseSku;
  let n = 1;
  while (await db.product.findUnique({ where: { sku } })) {
    n++;
    sku = `${baseSku}-${n}`;
  }

  const product = await db.product.create({
    data: {
      nama: data.nama,
      sku,
      jenisItem: data.jenisItem,
      asalKebun: data.asalKebun || null,
      deskripsi: data.deskripsi || null,
      ambangStokTipis: data.ambangStokTipis ?? null,
      status: data.aktifkan ? "aktif" : "draft",
      saleUnits: { create: [{ satuan: data.satuan, harga: data.harga, minOrder: data.minOrder }] },
      stock: { create: { jumlah: data.stokAwal, ditahan: 0 } },
    },
  });

  await db.actionLog.create({
    data: {
      entitas: "product",
      entitasId: product.id,
      actorId: auth.staff.id,
      aksi: "buat_produk",
      nilaiBaru: { nama: data.nama, sku, jenisItem: data.jenisItem, harga: data.harga },
    },
  });

  revalidatePath("/admin/stok");
  return { ok: true as const };
}

const updatePriceSchema = z.object({
  saleUnitId: z.string().uuid(),
  satuan: z.string().min(1),
  harga: z.coerce.number().min(0),
  minOrder: z.coerce.number().int().min(1),
});

export async function updateSaleUnit(input: z.infer<typeof updatePriceSchema>) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const parsed = updatePriceSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Data tidak valid." };
  const { saleUnitId, satuan, harga, minOrder } = parsed.data;

  const before = await db.saleUnit.findUnique({ where: { id: saleUnitId } });
  if (!before) return { ok: false as const, error: "Satuan jual tidak ditemukan." };

  await db.saleUnit.update({ where: { id: saleUnitId }, data: { satuan, harga, minOrder } });

  await db.actionLog.create({
    data: {
      entitas: "product",
      entitasId: before.productId,
      actorId: auth.staff.id,
      aksi: "ubah_harga",
      nilaiLama: { satuan: before.satuan, harga: before.harga.toString(), minOrder: before.minOrder },
      nilaiBaru: { satuan, harga, minOrder },
    },
  });

  revalidatePath("/admin/stok");
  return { ok: true as const };
}

const updateStatusSchema = z.object({
  productId: z.string().uuid(),
  status: z.enum(["aktif", "draft", "habis"]),
});

export async function updateProductStatus(input: z.infer<typeof updateStatusSchema>) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth;

  const parsed = updateStatusSchema.safeParse(input);
  if (!parsed.success) return { ok: false as const, error: "Data tidak valid." };
  const { productId, status } = parsed.data;

  const before = await db.product.findUnique({ where: { id: productId } });
  if (!before) return { ok: false as const, error: "Produk tidak ditemukan." };

  await db.product.update({ where: { id: productId }, data: { status } });

  await db.actionLog.create({
    data: {
      entitas: "product",
      entitasId: productId,
      actorId: auth.staff.id,
      aksi: "ubah_status_produk",
      nilaiLama: { status: before.status },
      nilaiBaru: { status },
    },
  });

  revalidatePath("/admin/stok");
  return { ok: true as const };
}
