import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { stockUnitId, usesUnitStock } from "@/lib/stock-target";
import { sendWhatsApp } from "@/lib/whatsapp";
import { cancelOrderInTx, pesanBatalWa } from "@/lib/order-cancel";
import { BATAS_KONFIRMASI_JAM, PENGINGAT_KONFIRMASI_JAM } from "@/lib/order-rules";

/**
 * BR-04: pesanan yang tidak dibayar dalam 1 hari sejak tagihan dikirim
 * otomatis jadi "kedaluwarsa" dan stok yang di-hold dilepas.
 *
 * Juga: (1) pesanan "menunggu konfirmasi" yang tidak ditangani tim lebih dari
 * BATAS_KONFIRMASI_JAM dibatalkan otomatis (jaring pengaman; konfirmasi manual
 * tetap jalur utama), (2) satu WhatsApp ringkasan ke admin untuk pesanan yang masih
 * menunggu konfirmasi lebih dari PENGINGAT_KONFIRMASI_JAM. Cron cuma jalan harian
 * (plan Hobby), jadi pembatalan bisa tertunda sampai ~48 jam setelah pesanan dibuat.
 *
 * Dipanggil berkala oleh Vercel Cron (lihat vercel.json) — dilindungi
 * CRON_SECRET supaya tidak bisa dipicu sembarang orang dari luar.
 */
export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;

  if (!secret || authHeader !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const expiredOrders = await db.order.findMany({
    where: { status: "menunggu_bayar", batasBayar: { lt: new Date() } },
    include: { items: { include: { saleUnit: true } }, customer: true },
  });

  let count = 0;
  for (const order of expiredOrders) {
    await db.$transaction(async (tx) => {
      await tx.order.update({ where: { id: order.id }, data: { status: "kedaluwarsa" } });

      for (const item of order.items) {
        if (usesUnitStock(item.saleUnit)) {
          await tx.saleUnitStock.update({
            where: { saleUnitId: stockUnitId(item.saleUnit) },
            data: { ditahan: { decrement: Number(item.qty) } },
          });
        } else {
          await tx.stock.update({
            where: { productId: item.saleUnit.productId },
            data: { ditahan: { decrement: Number(item.qty) } },
          });
        }
      }

      await tx.actionLog.create({
        data: {
          entitas: "order",
          entitasId: order.id,
          aksi: "kedaluwarsa_otomatis",
          nilaiLama: { status: "menunggu_bayar" },
          nilaiBaru: { status: "kedaluwarsa" },
        },
      });
    });

    await sendWhatsApp(
      order.customer.wa,
      `Halo ${order.customer.nama}, pesanan Farmhill Store kamu kedaluwarsa karena belum dibayar dalam 1 hari. Stok sudah dilepas — silakan pesan ulang kalau masih berminat.`
    );

    count++;
  }

  // Batalkan otomatis pesanan yang terlalu lama menunggu konfirmasi tim.
  const batas = new Date(Date.now() - BATAS_KONFIRMASI_JAM * 3600_000);
  const staleOrders = await db.order.findMany({
    where: { status: "menunggu_konfirmasi", createdAt: { lt: batas } },
    include: { items: { include: { saleUnit: true } }, customer: true },
  });

  let canceled = 0;
  for (const order of staleOrders) {
    const alasan = `Tidak dikonfirmasi dalam ${BATAS_KONFIRMASI_JAM} jam`;
    const done = await db.$transaction((tx) => cancelOrderInTx(tx, order, { aksi: "dibatalkan_otomatis", alasan, actorId: null }));
    if (!done) continue;
    await sendWhatsApp(order.customer.wa, pesanBatalWa(order.customer.nama, alasan));
    canceled++;
  }

  // Pengingat ke admin: yang masih menunggu konfirmasi lebih dari PENGINGAT_KONFIRMASI_JAM.
  const adminWa = process.env.ADMIN_WHATSAPP_NUMBER;
  const ambangPengingat = new Date(Date.now() - PENGINGAT_KONFIRMASI_JAM * 3600_000);
  const menunggu = await db.order.findMany({
    where: { status: "menunggu_konfirmasi", createdAt: { lt: ambangPengingat } },
    include: { customer: true },
    orderBy: { createdAt: "asc" },
  });
  let reminded = 0;
  if (adminWa && menunggu.length > 0) {
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    const tampil = menunggu.slice(0, 15).map((o) => {
      const jam = Math.floor((Date.now() - o.createdAt.getTime()) / 3600_000);
      return `• #${o.id.slice(0, 8).toUpperCase()} — ${o.customer.nama} (${jam} jam)`;
    });
    const sisa = menunggu.length - tampil.length;
    await sendWhatsApp(
      adminWa,
      `Pengingat Farmhill Store: ${menunggu.length} pesanan menunggu konfirmasi lebih dari ${PENGINGAT_KONFIRMASI_JAM} jam.\n${tampil.join("\n")}${sisa > 0 ? `\n…dan ${sisa} lainnya` : ""}\nPesanan yang tidak ditangani ${BATAS_KONFIRMASI_JAM} jam akan dibatalkan otomatis.\nBuka: ${appUrl}/admin/pesanan`
    );
    reminded = menunggu.length;
  }

  return NextResponse.json({ ok: true, expired: count, canceled, reminded });
}
