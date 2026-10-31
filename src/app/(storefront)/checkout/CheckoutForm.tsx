"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2 } from "lucide-react";
import { useCart } from "@/lib/cart-context";
import { CATEGORY_ICON, formatRupiah } from "@/lib/catalog";
import { createOrder } from "@/lib/actions/create-order";
import { previewVoucher } from "@/lib/actions/apply-voucher";

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function CheckoutForm({ initialNama, initialWa }: { initialNama: string; initialWa: string }) {
  const router = useRouter();
  const { items, subtotal, updateQty, updateKg, removeItem, clear } = useCart();
  const [nama, setNama] = useState(initialNama);
  const [wa, setWa] = useState(initialWa);
  const [alamat, setAlamat] = useState("");
  const [tanggal, setTanggal] = useState(todayStr());
  const [metodeTerima, setMetodeTerima] = useState<"driver" | "ambil_sendiri" | "ekspedisi">("driver");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [voucherInput, setVoucherInput] = useState("");
  const [voucherChecking, setVoucherChecking] = useState(false);
  const [voucherError, setVoucherError] = useState<string | null>(null);
  const [appliedVoucher, setAppliedVoucher] = useState<{ kode: string; diskon: number } | null>(null);

  if (items.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 py-20 text-center">
        <p className="text-lg font-semibold text-[var(--text-heading)]">Keranjang kamu masih kosong</p>
        <p className="text-sm text-[var(--text-muted)]">Yuk mulai belanja buah segar hari ini.</p>
        <Link
          href="/katalog"
          className="mt-2 rounded-[var(--radius-control)] bg-[var(--action-primary-bg)] px-5 py-2.5 text-sm font-semibold text-[var(--text-on-brand)] hover:bg-[var(--action-primary-bg-hover)]"
        >
          Lihat katalog
        </Link>
      </div>
    );
  }

  async function handleApplyVoucher() {
    setVoucherError(null);
    if (!voucherInput.trim()) return;
    setVoucherChecking(true);
    const result = await previewVoucher({ kode: voucherInput, subtotal });
    setVoucherChecking(false);
    if (!result.ok) {
      setAppliedVoucher(null);
      setVoucherError(result.error);
      return;
    }
    setAppliedVoucher({ kode: result.kode, diskon: result.diskon });
  }

  function handleRemoveVoucher() {
    setAppliedVoucher(null);
    setVoucherInput("");
    setVoucherError(null);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (metodeTerima !== "ambil_sendiri" && alamat.trim().length === 0) {
      setError("Alamat wajib diisi untuk pengiriman driver/ekspedisi.");
      return;
    }

    setSubmitting(true);
    const result = await createOrder({
      nama,
      wa,
      alamat: metodeTerima === "ambil_sendiri" ? "" : alamat,
      tanggalSlot: tanggal,
      metodeTerima,
      items: items.map((i) =>
        i.perluTimbang
          ? i.kgDiminta !== undefined
            ? { saleUnitId: i.saleUnitId, kgDiminta: i.kgDiminta }
            : { saleUnitId: i.saleUnitId, butirDiminta: i.qty }
          : { saleUnitId: i.saleUnitId, qty: i.qty }
      ),
      voucherKode: appliedVoucher?.kode,
    });
    setSubmitting(false);

    if (!result.ok) {
      setError(result.error);
      return;
    }

    clear();
    router.push(`/pesanan/${result.orderId}`);
  }

  return (
    <div>
      <h1 className="font-serif text-[28px] font-semibold tracking-[-0.01em] text-[var(--text-heading)]">
        Keranjang &amp; checkout
      </h1>

      <form onSubmit={handleSubmit} className="mt-5 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-start">
        <div className="flex flex-col gap-4">
          {/* Item */}
          <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] p-[18px]">
            <h2 className="mb-3.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)]">
              Item · {items.length} produk
            </h2>
            <div className="flex flex-col">
              {items.map((item, idx) => {
                const Icon = item.jenisItem ? CATEGORY_ICON[item.jenisItem] : undefined;
                return (
                  <div
                    key={item.saleUnitId}
                    className={`flex flex-col gap-3 py-3.5 sm:flex-row sm:items-center sm:gap-3.5 ${idx > 0 ? "border-t border-[var(--border-subtle)]" : ""}`}
                  >
                    <div className="flex min-w-0 items-center gap-3.5 sm:flex-1">
                      <div className="flex h-14 w-14 flex-none items-center justify-center rounded-[var(--radius-control)] bg-[var(--surface-sunken)] p-1.5">
                        {Icon && <Icon size={24} strokeWidth={1.5} className="text-[var(--text-subtle)]" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[15px] font-semibold text-[var(--text-heading)]">{item.nama}</p>
                        <p className="fh-numeric mt-0.5 text-[13px] text-[var(--text-muted)]">
                          {item.perluTimbang ? `${formatRupiah(item.harga)} / kg` : `${formatRupiah(item.harga)} / ${item.satuan}`}
                        </p>
                        {item.perluTimbang && (
                          <p className="mt-0.5 text-[12px] text-[var(--status-info-fg)]">Harga final setelah ditimbang sales</p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:contents">
                      {item.kgDiminta !== undefined ? (
                        <div className="flex flex-none items-center gap-1.5">
                          <input
                            type="number"
                            step="0.1"
                            min={0.1}
                            value={item.kgDiminta}
                            onChange={(e) => updateKg(item.saleUnitId, Number(e.target.value) || 0)}
                            className="fh-numeric h-[34px] w-20 rounded-[var(--radius-control)] border border-[var(--border-default)] px-2 text-sm outline-none focus:border-[var(--border-focus)]"
                          />
                          <span className="text-sm text-[var(--text-muted)]">kg</span>
                        </div>
                      ) : (
                        <div className="flex flex-none items-center rounded-[var(--radius-control)] border border-[var(--border-default)]">
                          <button
                            type="button"
                            onClick={() => updateQty(item.saleUnitId, Math.max(item.minOrder, item.qty - 1))}
                            className="flex h-[34px] w-[34px] items-center justify-center text-[var(--text-brand)] hover:bg-[var(--surface-hover)]"
                            aria-label="Kurangi"
                          >
                            <Minus size={14} strokeWidth={2.25} />
                          </button>
                          <span className="fh-numeric w-9 text-center text-sm">{item.qty}</span>
                          <button
                            type="button"
                            onClick={() => updateQty(item.saleUnitId, item.qty + 1)}
                            className="flex h-[34px] w-[34px] items-center justify-center text-[var(--text-brand)] hover:bg-[var(--surface-hover)]"
                            aria-label="Tambah"
                          >
                            <Plus size={14} strokeWidth={2.25} />
                          </button>
                        </div>
                      )}
                      <span className="fh-numeric flex-none text-right text-[15px] font-semibold text-[var(--text-heading)] sm:w-[100px]">
                        {item.perluTimbang ? (
                          <span className="text-[13px] font-normal text-[var(--text-muted)]">Menyusul</span>
                        ) : (
                          formatRupiah(item.harga * item.qty)
                        )}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeItem(item.saleUnitId)}
                        aria-label="Hapus"
                        className="flex-none text-[var(--text-subtle)] hover:text-[var(--status-danger-fg)]"
                      >
                        <Trash2 size={16} strokeWidth={1.75} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Data penerima */}
          <div className="grid grid-cols-1 gap-4 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] p-[18px] sm:grid-cols-2">
            <h2 className="col-span-full text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)]">
              Data penerima
            </h2>
            <Field label="Nama" htmlFor="nama">
              <input
                id="nama"
                required
                value={nama}
                onChange={(e) => setNama(e.target.value)}
                className={inputClass}
                placeholder="Nama penerima"
              />
            </Field>
            <Field label="Nomor WhatsApp" htmlFor="wa">
              <input
                id="wa"
                required
                value={wa}
                onChange={(e) => setWa(e.target.value)}
                className={inputClass}
                placeholder="08xxxxxxxxxx"
              />
            </Field>

            <div className="col-span-full">
              <p className="mb-2 text-[13px] font-semibold text-[var(--text-body)]">Cara terima</p>
              <div className="flex flex-wrap gap-2.5">
                {(
                  [
                    { v: "driver", l: "Diantar driver" },
                    { v: "ambil_sendiri", l: "Ambil di gudang" },
                    { v: "ekspedisi", l: "Ekspedisi pihak ke-3" },
                  ] as const
                ).map((opt) => (
                  <PillOption key={opt.v} active={metodeTerima === opt.v} onClick={() => setMetodeTerima(opt.v)}>
                    {opt.l}
                  </PillOption>
                ))}
              </div>
            </div>

            {metodeTerima !== "ambil_sendiri" && (
              <div className="col-span-full">
                <Field label="Alamat pengiriman" htmlFor="alamat">
                  <textarea
                    id="alamat"
                    required
                    value={alamat}
                    onChange={(e) => setAlamat(e.target.value)}
                    rows={2}
                    className={`${inputClass} h-auto resize-none py-2.5`}
                    placeholder="Jalan, nomor rumah, kecamatan, patokan"
                  />
                </Field>
              </div>
            )}
          </div>

          {/* Jadwal kirim */}
          <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] p-[18px]">
            <h2 className="mb-3.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)]">
              Jadwal kirim
            </h2>
            <div className="max-w-[260px]">
              <Field label="Tanggal kirim" htmlFor="tanggal">
                <input
                  id="tanggal"
                  type="date"
                  required
                  min={todayStr()}
                  value={tanggal}
                  onChange={(e) => setTanggal(e.target.value)}
                  className={inputClass}
                />
              </Field>
              <p className="mt-2.5 text-[13px] text-[var(--text-muted)]">
                Pilih tanggal kirim. Sales akan mengonfirmasi pesanan lewat WhatsApp.
              </p>
            </div>
          </div>
        </div>

        {/* Rincian biaya */}
        <div className="flex flex-col gap-3.5">
          <div className="flex flex-col gap-2.5 rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] p-[18px]">
            <h2 className="mb-0.5 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)]">
              Rincian biaya
            </h2>
            <div className="flex justify-between text-[15px] text-[var(--text-body)]">
              <span>Subtotal</span>
              <span className="fh-numeric font-semibold">{formatRupiah(subtotal)}</span>
            </div>
            {items.some((i) => i.perluTimbang) && (
              <p className="text-[12.5px] text-[var(--text-muted)]">
                Belum termasuk {items.filter((i) => i.perluTimbang).length} item melon yang ditimbang dulu — harganya
                menyusul di tagihan.
              </p>
            )}
            {appliedVoucher && (
              <div className="flex justify-between text-[15px] text-[var(--status-success-fg)]">
                <span>Voucher {appliedVoucher.kode}</span>
                <span className="fh-numeric font-semibold">-{formatRupiah(appliedVoucher.diskon)}</span>
              </div>
            )}
            <div className="flex justify-between text-[15px] text-[var(--text-body)]">
              <span>Ongkir</span>
              <span className="text-[var(--text-muted)]">Menyusul dari sales</span>
            </div>

            <div className="border-t border-[var(--border-default)] pt-2.5">
              {appliedVoucher ? (
                <div className="flex items-center justify-between rounded-[var(--radius-control)] bg-[var(--status-success-bg)] px-3 py-2 text-[13px] text-[var(--status-success-fg)]">
                  <span className="font-semibold">Voucher {appliedVoucher.kode} terpasang</span>
                  <button type="button" onClick={handleRemoveVoucher} className="font-semibold underline">
                    Hapus
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    value={voucherInput}
                    onChange={(e) => setVoucherInput(e.target.value.toUpperCase())}
                    placeholder="Kode voucher"
                    className="h-10 flex-1 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 text-sm uppercase outline-none focus:border-[var(--border-focus)]"
                  />
                  <button
                    type="button"
                    onClick={handleApplyVoucher}
                    disabled={voucherChecking || !voucherInput.trim()}
                    className="h-10 flex-none rounded-[var(--radius-control)] border border-[var(--border-default)] px-3.5 text-sm font-semibold text-[var(--text-body)] hover:bg-[var(--surface-hover)] disabled:opacity-60"
                  >
                    {voucherChecking ? "Cek…" : "Pakai"}
                  </button>
                </div>
              )}
              {voucherError && <p className="mt-1.5 text-[13px] text-[var(--status-danger-fg)]">{voucherError}</p>}
            </div>

            <p className="mt-0.5 border-t border-[var(--border-default)] pt-2.5 text-[13px] leading-relaxed text-[var(--text-muted)]">
              Ongkir ditetapkan sales setelah pesanan dikonfirmasi.
            </p>

            {error && (
              <p className="rounded-[var(--radius-control)] bg-[var(--status-danger-bg)] px-3 py-2 text-sm text-[var(--status-danger-fg)]">
                {error}
              </p>
            )}

            <button
              type="submit"
              disabled={submitting}
              className="h-[42px] rounded-[var(--radius-control)] bg-[var(--action-primary-bg)] text-sm font-semibold text-[var(--text-on-brand)] transition-colors hover:bg-[var(--action-primary-bg-hover)] disabled:opacity-60"
            >
              {submitting ? "Mengirim pesanan…" : "Kirim pesanan"}
            </button>
            <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">Belum ada pembayaran di langkah ini.</p>
          </div>

          <div className="rounded-[var(--radius-card)] border border-[var(--status-info-border)] bg-[var(--status-info-bg)] p-[18px]">
            <p className="text-sm font-semibold text-[var(--status-info-fg)]">Total akhir menyusul</p>
            <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--status-info-fg)]">
              Sales cek stok &amp; tetapkan ongkir, lalu tagihan dikirim lewat WhatsApp. Batas bayar 1 hari sejak tagihan
              terkirim.
            </p>
          </div>
        </div>
      </form>
    </div>
  );
}

const inputClass =
  "h-10 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 text-sm text-[var(--text-body)] outline-none transition-[border-color,box-shadow] focus:border-[var(--border-focus)] focus:shadow-[var(--shadow-focus)]";

function Field({ label, htmlFor, children }: { label: string; htmlFor: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-[13px] font-semibold text-[var(--text-body)]" htmlFor={htmlFor}>
        {label}
      </label>
      {children}
    </div>
  );
}

function PillOption({
  active,
  disabled,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`rounded-[var(--radius-control)] border px-3.5 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:border-[var(--border-default)] disabled:bg-[var(--surface-disabled)] disabled:text-[var(--text-disabled)] ${
        active && !disabled
          ? "border-[var(--border-brand)] bg-[var(--surface-selected)] font-semibold text-[var(--text-heading)]"
          : "border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-body)] hover:border-[var(--border-strong)]"
      }`}
    >
      {children}
    </button>
  );
}
