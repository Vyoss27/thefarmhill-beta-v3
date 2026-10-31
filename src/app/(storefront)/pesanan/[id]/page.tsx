import Link from "next/link";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/catalog";
import { getStoreSetting } from "@/lib/store-settings";
import { jamSlotLabel } from "@/lib/slot";
import PaymentUploadForm from "./PaymentUploadForm";

const STATUS_LABEL: Record<string, string> = {
  menunggu_konfirmasi: "Menunggu konfirmasi sales",
  menunggu_bayar: "Menunggu pembayaran",
  diproses: "Diproses / dikemas",
  dikirim: "Dikirim / siap diambil",
  selesai: "Selesai",
  dibatalkan: "Dibatalkan",
  kedaluwarsa: "Kedaluwarsa",
};

const BANNER: Record<string, { title: string; message: string }> = {
  menunggu_konfirmasi: {
    title: "Pesanan diterima!",
    message: "Sales akan cek stok & tetapkan ongkir dalam waktu dekat. Kamu akan dihubungi lewat WhatsApp.",
  },
  menunggu_bayar: {
    title: "Ongkir sudah ditetapkan",
    message: "Segera selesaikan pembayaran sebelum batas waktu di bawah supaya pesanan tidak kedaluwarsa.",
  },
  diproses: {
    title: "Pesanan sedang dikemas",
    message: "Tim gudang sedang menyiapkan pesananmu.",
  },
  dikirim: {
    title: "Pesanan dalam pengiriman",
    message: "Pesananmu sedang diantar / siap diambil sesuai slot yang dipilih.",
  },
  selesai: {
    title: "Pesanan selesai",
    message: "Terima kasih sudah belanja buah segar di Farmhill Store!",
  },
  dibatalkan: {
    title: "Pesanan dibatalkan",
    message: "Ada kendala pada pesanan ini. Hubungi sales lewat WhatsApp kalau ada pertanyaan.",
  },
  kedaluwarsa: {
    title: "Pesanan kedaluwarsa",
    message: "Pembayaran tidak diterima dalam batas 1 hari, stok sudah dilepas. Silakan pesan ulang kalau masih berminat.",
  },
};

const BADGE_TONE: Record<string, { bg: string; fg: string }> = {
  menunggu_konfirmasi: { bg: "var(--status-accent-bg)", fg: "var(--status-accent-fg)" },
  menunggu_bayar: { bg: "var(--status-accent-bg)", fg: "var(--status-accent-fg)" },
  diproses: { bg: "var(--status-info-bg)", fg: "var(--status-info-fg)" },
  dikirim: { bg: "var(--status-info-bg)", fg: "var(--status-info-fg)" },
  selesai: { bg: "var(--status-success-bg)", fg: "var(--status-success-fg)" },
  dibatalkan: { bg: "var(--status-neutral-bg)", fg: "var(--status-neutral-fg)" },
  kedaluwarsa: { bg: "var(--status-danger-bg)", fg: "var(--status-danger-fg)" },
};

const STEP_ORDER = ["menunggu_konfirmasi", "menunggu_bayar", "diproses", "dikirim", "selesai"] as const;

export default async function OrderConfirmationPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id },
    include: {
      items: { include: { saleUnit: { include: { product: true } } } },
      customer: true,
      payments: { orderBy: { waktu: "desc" }, take: 1 },
    },
  });

  if (!order) notFound();
  const setting = await getStoreSetting();
  const banner = BANNER[order.status] ?? BANNER.menunggu_konfirmasi;
  const badgeTone = BADGE_TONE[order.status] ?? BADGE_TONE.menunggu_konfirmasi;
  const isTerminalStopped = order.status === "dibatalkan" || order.status === "kedaluwarsa";
  const currentIndex = STEP_ORDER.indexOf(order.status as (typeof STEP_ORDER)[number]);

  const createdAtLabel = order.createdAt.toLocaleString("id-ID", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Jakarta",
  });
  const batasBayarLabel = order.batasBayar
    ? order.batasBayar.toLocaleString("id-ID", { dateStyle: "medium", timeStyle: "short", timeZone: "Asia/Jakarta" })
    : null;

  const adminWa = process.env.ADMIN_WHATSAPP_NUMBER;
  const waHref = adminWa
    ? `https://wa.me/${adminWa}?text=${encodeURIComponent(`Halo, saya mau tanya soal pesanan ${order.id.slice(0, 8).toUpperCase()}`)}`
    : null;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-subtle)]">
            Pesanan
          </span>
          <h1 className="mt-1.5 font-serif text-[28px] font-semibold tracking-[-0.01em] text-[var(--text-heading)]">
            Lacak pesanan
          </h1>
          <p className="fh-numeric mt-1.5 font-mono text-[13px] text-[var(--text-muted)]">
            {order.id.slice(0, 8).toUpperCase()} ·{" "}
            {order.createdAt.toLocaleDateString("id-ID", { dateStyle: "medium", timeZone: "Asia/Jakarta" })}
          </p>
        </div>
        <span
          className="flex items-center gap-2 rounded-[var(--radius-badge)] px-3 py-1.5 text-sm font-semibold"
          style={{ background: badgeTone.bg, color: badgeTone.fg }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: badgeTone.fg }} />
          {STATUS_LABEL[order.status] ?? order.status}
        </span>
      </div>

      <div className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start">
        {/* Riwayat status */}
        <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] p-[22px]">
          <h2 className="mb-[18px] text-sm font-semibold text-[var(--text-heading)]">Riwayat status</h2>

          {isTerminalStopped ? (
            <div className="flex flex-col gap-0">
              <TimelineRow
                label="Pesanan dibuat"
                meta={createdAtLabel}
                dotColor="var(--success-500)"
                ringColor="var(--success-300)"
                lineColor="var(--success-300)"
                isLast={false}
              />
              <TimelineRow
                label={STATUS_LABEL[order.status]}
                meta={banner.message}
                dotColor="var(--status-danger-fg)"
                ringColor="var(--danger-300)"
                lineColor="transparent"
                isLast
              />
            </div>
          ) : (
            <div className="flex flex-col gap-0">
              {STEP_ORDER.map((step, idx) => {
                const done = idx < currentIndex;
                const active = idx === currentIndex;
                const dotColor = done ? "var(--success-500)" : active ? "var(--surface-accent)" : "var(--border-strong)";
                const ringColor = done ? "var(--success-300)" : active ? "var(--melon-300)" : "var(--border-default)";
                const lineColor = idx < STEP_ORDER.length - 1 ? (done ? "var(--success-300)" : "var(--border-subtle)") : "transparent";
                const meta =
                  step === "menunggu_konfirmasi"
                    ? createdAtLabel
                    : step === "menunggu_bayar" && batasBayarLabel && (active || done)
                      ? `Batas bayar ${batasBayarLabel}`
                      : undefined;
                return (
                  <TimelineRow
                    key={step}
                    label={STATUS_LABEL[step]}
                    meta={meta}
                    dotColor={dotColor}
                    ringColor={ringColor}
                    lineColor={lineColor}
                    isLast={idx === STEP_ORDER.length - 1}
                    fg={done || active ? "var(--text-heading)" : "var(--text-disabled)"}
                  />
                );
              })}
            </div>
          )}
        </div>

        {/* Kolom kanan */}
        <div className="flex flex-col gap-3.5">
          <div
            className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] p-[18px]"
            style={order.status === "menunggu_bayar" ? { borderTop: "3px solid var(--border-accent)" } : undefined}
          >
            <p className="text-[15px] font-semibold text-[var(--text-heading)]">{banner.title}</p>
            <p className="mt-1 text-sm leading-relaxed text-[var(--text-body)]">{banner.message}</p>
            {waHref && (
              <a
                href={waHref}
                target="_blank"
                rel="noreferrer"
                className="mt-3 flex h-[34px] items-center justify-center rounded-[var(--radius-control)] border border-[var(--border-default)] text-sm font-semibold text-[var(--text-body)] hover:border-[var(--border-strong)]"
              >
                Chat sales
              </a>
            )}
          </div>

          {order.status === "menunggu_bayar" && order.ongkir !== null && (
            <PaymentUploadForm
              orderId={order.id}
              latestPayment={order.payments[0] ?? null}
              batasBayar={order.batasBayar ? order.batasBayar.toISOString() : null}
              banks={setting.banks}
              qrisImageUrl={setting.qrisImageUrl}
            />
          )}

          <div className="flex flex-col gap-2.5 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] p-[18px]">
            <h2 className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)]">Rincian</h2>
            {order.items.map((item) => {
              const perluTimbang = !!item.saleUnit.ukuran;
              const jumlahLabel = perluTimbang
                ? item.butirDiminta
                  ? `× ${item.butirDiminta} butir (≈${Number(item.qty)} kg)`
                  : `≈${Number(item.qty)} kg diminta`
                : `(${item.saleUnit.satuan}) × ${item.qty.toString()}`;
              return (
                <div key={item.id} className="flex justify-between text-sm text-[var(--text-body)]">
                  <span className="truncate pr-2">
                    {item.saleUnit.product.nama}
                    {item.saleUnit.ukuran ? ` · ${item.saleUnit.ukuran}` : ""} {jumlahLabel}
                  </span>
                  <span className="fh-numeric flex-none">
                    {perluTimbang
                      ? item.beratAktual
                        ? formatRupiah(Number(item.hargaSaatPesan) * Number(item.beratAktual))
                        : "Menyusul"
                      : formatRupiah(Number(item.hargaSaatPesan) * Number(item.qty))}
                  </span>
                </div>
              );
            })}
            <div className="flex justify-between border-t border-[var(--border-subtle)] pt-2.5 text-sm text-[var(--text-body)]">
              <span>Subtotal</span>
              <span className="fh-numeric font-semibold">{formatRupiah(Number(order.subtotal))}</span>
            </div>
            {order.ongkir !== null ? (
              <>
                <div className="flex justify-between text-sm text-[var(--text-body)]">
                  <span>Ongkir</span>
                  <span className="fh-numeric font-semibold">{formatRupiah(Number(order.ongkir))}</span>
                </div>
                {Number(order.diskon) > 0 && (
                  <div className="flex justify-between text-sm text-[var(--text-body)]">
                    <span>Diskon</span>
                    <span className="fh-numeric font-semibold">−{formatRupiah(Number(order.diskon))}</span>
                  </div>
                )}
                <div className="flex justify-between border-t border-[var(--border-default)] pt-2.5 text-[15px] text-[var(--text-heading)]">
                  <span className="font-semibold">Total tagihan</span>
                  <span className="fh-numeric font-semibold">{formatRupiah(Number(order.total))}</span>
                </div>
              </>
            ) : (
              <div className="flex justify-between text-sm text-[var(--text-body)]">
                <span>Ongkir</span>
                <span className="text-[var(--text-muted)]">Menyusul dari sales</span>
              </div>
            )}
            <div className="flex justify-between border-t border-[var(--border-subtle)] pt-2.5 text-sm text-[var(--text-body)]">
              <span>Tanggal kirim</span>
              <span className="fh-numeric font-semibold">
                {order.tanggalSlot.toLocaleDateString("id-ID", { dateStyle: "medium", timeZone: "UTC" })}
              </span>
            </div>
            {jamSlotLabel(order.jamSlot) && (
              <div className="flex justify-between text-sm text-[var(--text-body)]">
                <span>Slot</span>
                <span className="fh-numeric font-semibold">{order.jamSlot}</span>
              </div>
            )}
            <div className="flex justify-between text-sm text-[var(--text-body)]">
              <span>Cara terima</span>
              <span className="font-semibold capitalize">{order.metodeTerima.replace("_", " ")}</span>
            </div>
            {!waHref && (
              <p className="mt-1 text-xs text-[var(--text-muted)]">
                Ada pertanyaan? Hubungi sales lewat WhatsApp yang sudah menghubungi kamu.
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="mt-6 flex flex-col gap-2.5 sm:flex-row">
        <Link
          href="/katalog"
          className="block w-full rounded-[var(--radius-control)] border border-[var(--border-default)] py-3 text-center text-sm font-semibold text-[var(--text-body)] hover:border-[var(--border-strong)] sm:w-fit sm:px-8"
        >
          Kembali ke katalog
        </Link>
        <Link
          href={`/pesanan/${order.id}/invoice`}
          target="_blank"
          className="block w-full rounded-[var(--radius-control)] border border-[var(--border-default)] py-3 text-center text-sm font-semibold text-[var(--text-body)] hover:border-[var(--border-strong)] sm:w-fit sm:px-8"
        >
          Lihat invoice
        </Link>
      </div>
    </div>
  );
}

function TimelineRow({
  label,
  meta,
  dotColor,
  ringColor,
  lineColor,
  isLast,
  fg = "var(--text-heading)",
}: {
  label: string;
  meta?: string;
  dotColor: string;
  ringColor: string;
  lineColor: string;
  isLast: boolean;
  fg?: string;
}) {
  return (
    <div className="flex items-stretch gap-3.5">
      <div className="flex w-4 flex-none flex-col items-center">
        <div
          className="mt-1 h-[11px] w-[11px] rounded-full border-2 border-[var(--surface-card)]"
          style={{ background: dotColor, boxShadow: `0 0 0 1px ${ringColor}` }}
        />
        {!isLast && <div className="w-0.5 flex-1" style={{ background: lineColor, minHeight: "22px" }} />}
      </div>
      <div className={isLast ? "flex-1" : "flex-1 pb-[18px]"}>
        <p className="text-[15px] font-semibold" style={{ color: fg }}>
          {label}
        </p>
        {meta && <p className="fh-numeric mt-0.5 text-[13px] text-[var(--text-muted)]">{meta}</p>}
      </div>
    </div>
  );
}
