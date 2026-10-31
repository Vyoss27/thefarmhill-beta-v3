import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/catalog";
import { createAdminClient } from "@/lib/supabase/admin";
import ConfirmOrderForm from "./ConfirmOrderForm";
import ExpireOrderButton from "./ExpireOrderButton";
import { tanggalDenganJam } from "@/lib/slot";
import CancelOrderButton from "./CancelOrderButton";
import PaymentVerificationPanel from "./PaymentVerificationPanel";
import AdvanceStatusButton from "./AdvanceStatusButton";
import WeighInForm from "./WeighInForm";

const STATUS_LABEL: Record<string, string> = {
  menunggu_konfirmasi: "Menunggu konfirmasi",
  menunggu_bayar: "Menunggu bayar",
  diproses: "Diproses",
  dikirim: "Dikirim",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
  kedaluwarsa: "Kedaluwarsa",
};

const STATUS_TONE: Record<string, { bg: string; fg: string }> = {
  menunggu_konfirmasi: { bg: "var(--status-accent-bg)", fg: "var(--status-accent-fg)" },
  menunggu_bayar: { bg: "var(--status-accent-bg)", fg: "var(--status-accent-fg)" },
  diproses: { bg: "var(--status-info-bg)", fg: "var(--status-info-fg)" },
  dikirim: { bg: "var(--status-info-bg)", fg: "var(--status-info-fg)" },
  selesai: { bg: "var(--status-success-bg)", fg: "var(--status-success-fg)" },
  dibatalkan: { bg: "var(--status-neutral-bg)", fg: "var(--status-neutral-fg)" },
  kedaluwarsa: { bg: "var(--status-danger-bg)", fg: "var(--status-danger-fg)" },
};

export default async function AdminOrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { include: { saleUnit: { include: { product: true } } } },
      payments: { orderBy: { waktu: "desc" }, take: 1 },
      voucherUsages: { include: { voucher: true } },
    },
  });

  if (!order) notFound();
  const tone = STATUS_TONE[order.status] ?? STATUS_TONE.menunggu_konfirmasi;
  const pendingWeighItems = order.items.filter((item) => item.saleUnit.ukuran && item.beratAktual === null);

  const pendingPayment = order.payments[0]?.status === "pending" ? order.payments[0] : null;
  let buktiSignedUrl: string | null = null;
  if (pendingPayment?.buktiUrl) {
    const supabase = createAdminClient();
    const { data } = await supabase.storage.from("bukti-pembayaran").createSignedUrl(pendingPayment.buktiUrl, 60 * 10);
    buktiSignedUrl = data?.signedUrl ?? null;
  }

  return (
    <div>
      <Link
        href="/admin/pesanan"
        className="inline-flex items-center gap-1.5 text-[13px] text-[var(--text-muted)] hover:text-[var(--text-link)]"
      >
        <ArrowLeft size={14} strokeWidth={2} />
        Kembali ke daftar pesanan
      </Link>

      <div className="mt-3 flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="fh-numeric font-mono text-xs text-[var(--text-muted)]">{order.id.toUpperCase()}</p>
          <h1 className="mt-1 font-serif text-[26px] font-semibold tracking-[-0.01em] text-[var(--text-heading)]">
            {order.customer.nama}
          </h1>
          <p className="text-sm text-[var(--text-muted)]">{order.customer.wa}</p>
        </div>
        <div className="flex items-center gap-2.5">
          <Link
            href={`/pesanan/${order.id}/invoice`}
            target="_blank"
            className="h-[34px] rounded-[var(--radius-control)] border border-[var(--border-default)] px-3 text-sm font-medium leading-[32px] text-[var(--text-body)] hover:border-[var(--border-strong)]"
          >
            Lihat invoice
          </Link>
          <span
            className="rounded-[var(--radius-badge)] px-2.5 py-1.5 text-sm font-semibold"
            style={{ background: tone.bg, color: tone.fg }}
          >
            {STATUS_LABEL[order.status] ?? order.status}
          </span>
        </div>
      </div>

      <div className="mt-5 grid gap-5 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-start">
        <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] p-5">
          <h2 className="text-sm font-semibold text-[var(--text-heading)]">Detail pesanan</h2>
          <dl className="mt-3 grid grid-cols-[140px_1fr] gap-y-2 text-sm">
            <dt className="text-[var(--text-muted)]">Cara terima</dt>
            <dd className="capitalize text-[var(--text-body)]">{order.metodeTerima.replace("_", " ")}</dd>
            <dt className="text-[var(--text-muted)]">Alamat</dt>
            <dd className="text-[var(--text-body)]">{order.customer.alamat || "—"}</dd>
            <dt className="text-[var(--text-muted)]">Tanggal kirim</dt>
            <dd className="fh-numeric text-[var(--text-body)]">
              {tanggalDenganJam(order.tanggalSlot.toLocaleDateString("id-ID", { dateStyle: "full", timeZone: "UTC" }), order.jamSlot)}
            </dd>
          </dl>

          <div className="mt-4 flex flex-col gap-2 border-t border-[var(--border-subtle)] pt-4 text-sm">
            {order.items.map((item) => {
              const perluTimbang = !!item.saleUnit.ukuran;
              const jumlahLabel = perluTimbang
                ? item.butirDiminta
                  ? `× ${item.butirDiminta} butir (≈${Number(item.qty)} kg)`
                  : `≈${Number(item.qty)} kg diminta`
                : `(${item.saleUnit.satuan}) × ${item.qty.toString()}`;
              return (
                <div key={item.id} className="flex justify-between text-[var(--text-body)]">
                  <span>
                    {item.saleUnit.product.nama}
                    {item.saleUnit.ukuran ? ` · ${item.saleUnit.ukuran}` : ""} {jumlahLabel}
                  </span>
                  <span className="fh-numeric font-semibold text-[var(--text-heading)]">
                    {perluTimbang
                      ? item.beratAktual
                        ? formatRupiah(Number(item.hargaSaatPesan) * Number(item.beratAktual))
                        : "Belum ditimbang"
                      : formatRupiah(Number(item.hargaSaatPesan) * Number(item.qty))}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="mt-3 flex justify-between border-t border-[var(--border-default)] pt-3 text-sm">
            <span className="font-semibold text-[var(--text-heading)]">Subtotal</span>
            <span className="fh-numeric font-semibold text-[var(--text-heading)]">{formatRupiah(Number(order.subtotal))}</span>
          </div>
        </div>

        {order.status === "menunggu_konfirmasi" && pendingWeighItems.length > 0 ? (
          <WeighInForm
            orderId={order.id}
            items={pendingWeighItems.map((item) => ({
              orderItemId: item.id,
              nama: item.saleUnit.product.nama,
              ukuran: item.saleUnit.ukuran!,
              qtyKgDiminta: Number(item.qty),
              butirDiminta: item.butirDiminta,
              hargaPerKg: Number(item.hargaSaatPesan),
            }))}
          />
        ) : order.status === "menunggu_konfirmasi" ? (
          <ConfirmOrderForm
            orderId={order.id}
            subtotal={Number(order.subtotal)}
            metodeTerima={order.metodeTerima}
            diskonAwal={Number(order.diskon)}
            voucherKode={order.voucherUsages[0]?.voucher.kode ?? null}
          />
        ) : (
          <div className="flex flex-col gap-2 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] p-5">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)]">Status</h2>
            <p className="text-[15px] font-semibold capitalize text-[var(--text-heading)]">
              {STATUS_LABEL[order.status] ?? order.status.replace(/_/g, " ")}
            </p>
            {order.ongkir !== null && (
              <div className="mt-1 flex flex-col gap-1 border-t border-[var(--border-subtle)] pt-3 text-sm text-[var(--text-body)]">
                <div className="flex justify-between">
                  <span>Ongkir</span>
                  <span className="fh-numeric font-semibold">{formatRupiah(Number(order.ongkir))}</span>
                </div>
                <div className="flex justify-between">
                  <span>Diskon</span>
                  <span className="fh-numeric font-semibold">{formatRupiah(Number(order.diskon))}</span>
                </div>
                <div className="flex justify-between border-t border-[var(--border-default)] pt-2 text-[15px] text-[var(--text-heading)]">
                  <span className="font-semibold">Total</span>
                  <span className="fh-numeric font-semibold">{formatRupiah(Number(order.total))}</span>
                </div>
              </div>
            )}
            {order.batasBayar && (
              <p className="mt-1 text-[13px] text-[var(--text-muted)]">
                Batas bayar:{" "}
                <span className="fh-numeric">
                  {order.batasBayar.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })}
                </span>
              </p>
            )}
            {pendingPayment && (
              <PaymentVerificationPanel
                paymentId={pendingPayment.id}
                metode={pendingPayment.metode}
                nominal={Number(pendingPayment.nominal)}
                buktiSignedUrl={buktiSignedUrl}
                waktu={pendingPayment.waktu.toISOString()}
              />
            )}
            {order.status === "menunggu_bayar" && <ExpireOrderButton orderId={order.id} />}
            <AdvanceStatusButton orderId={order.id} currentStatus={order.status} />
          </div>
        )}
        {(order.status === "menunggu_konfirmasi" || order.status === "menunggu_bayar") && (
          <CancelOrderButton orderId={order.id} />
        )}
      </div>
    </div>
  );
}
