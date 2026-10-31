"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";
import { formatRupiah } from "@/lib/catalog";
import { useCart } from "@/lib/cart-context";
import { melonSizeRangeLabel, melonSizeMinKg, melonSizeAvgKg } from "@/lib/melon-size";
import { melonGradeLabel, melonGradeSortIndex } from "@/lib/melon-grade";
import { joinWaitlist } from "@/lib/actions/waitlist";

type SaleUnit = {
  id: string;
  satuan: string;
  grade: string | null;
  ukuran: string | null;
  harga: number;
  estBerat: number | null;
  minOrder: number;
  stokTersedia: number | null;
};

export default function ProductDetailClient({
  productId,
  nama,
  jenisItem,
  saleUnits,
  isHabis,
}: {
  productId: string;
  nama: string;
  jenisItem: string;
  saleUnits: SaleUnit[];
  isHabis: boolean;
}) {
  const router = useRouter();
  const { addItem } = useCart();
  const [added, setAdded] = useState(false);
  const [waitlistState, setWaitlistState] = useState<"idle" | "loading" | "done">("idle");

  async function handleKabariSaya() {
    setWaitlistState("loading");
    const result = await joinWaitlist({ productId });
    if (!result.ok) {
      if (result.error === "login_required") {
        router.push("/login");
        return;
      }
      setWaitlistState("idle");
      return;
    }
    setWaitlistState("done");
  }

  const grades = useMemo(() => {
    const set = new Set(saleUnits.map((u) => u.grade).filter((g): g is string => !!g));
    return [...set].sort((a, b) => melonGradeSortIndex(a) - melonGradeSortIndex(b));
  }, [saleUnits]);
  // Buka di grade pertama yang masih ada stoknya (mis. Perfect habis tapi Imperfect ada).
  const [selectedGrade, setSelectedGrade] = useState<string | null>(
    grades.find((g) => saleUnits.some((u) => u.grade === g && (u.stokTersedia === null || u.stokTersedia > 0))) ?? grades[0] ?? null,
  );

  const unitsForGrade = selectedGrade ? saleUnits.filter((u) => u.grade === selectedGrade) : saleUnits;
  const sizeUnits = unitsForGrade.filter((u) => u.ukuran);
  const hasSizes = sizeUnits.length > 0;
  const hargaDasar = sizeUnits.length > 0 ? Math.min(...sizeUnits.map((u) => u.harga)) : 0;

  const [selectedSizeId, setSelectedSizeId] = useState<string | null>(sizeUnits[0]?.id ?? null);

  function handleGradeChange(grade: string) {
    setSelectedGrade(grade);
    const nextSizeUnits = saleUnits.filter((u) => u.grade === grade && u.ukuran);
    setSelectedSizeId(nextSizeUnits[0]?.id ?? null);
  }

  const unit = hasSizes ? (sizeUnits.find((u) => u.id === selectedSizeId) ?? sizeUnits[0]) : unitsForGrade[0];
  const [qty, setQty] = useState(unit?.minOrder ?? 1);
  const [belanjaMode, setBelanjaMode] = useState<"butir" | "kg">("butir");
  const minKg = unit?.ukuran ? (melonSizeMinKg(unit.ukuran) ?? 0.1) : 0.1;
  const [kgInput, setKgInput] = useState(String(minKg));

  if (!unit) return null;

  const perluTimbang = !!unit.ukuran;
  const sizeHabis = unit.stokTersedia !== null && unit.stokTersedia <= 0;
  const belumAdaHarga = Number(unit.harga) === 0;
  const total = Number(unit.harga) * qty;
  const estTotalBerat = unit.estBerat ? Number(unit.estBerat) * qty : null;
  const kgValue = Number(kgInput) || 0;
  const kgTotal = kgValue * Number(unit.harga);

  return (
    <div className="flex flex-col gap-5">
      {grades.length > 1 && (
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-subtle)]">Grade</span>
          <div className="mt-2.5 flex gap-2">
            {grades.map((g) => (
              <button
                key={g}
                type="button"
                onClick={() => handleGradeChange(g)}
                className={`rounded-[var(--radius-control)] border px-4 py-2 text-sm font-semibold transition-colors ${
                  selectedGrade === g
                    ? "border-[var(--border-brand)] bg-[var(--surface-selected)] text-[var(--text-brand)]"
                    : "border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-body)] hover:border-[var(--border-strong)]"
                }`}
              >
                {melonGradeLabel(g)}
              </button>
            ))}
          </div>
        </div>
      )}

      {selectedGrade === "imperfect" && (
        <p className="text-[12.5px] text-[var(--text-muted)]">
          Grade Imperfect — kadang dialokasikan jadi melon slice tergantung stok panen.
        </p>
      )}

      {hasSizes ? (
        <div>
          <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-subtle)]">Pilihan ukuran (opsional)</span>
          <p className="mt-1 text-[12.5px] leading-snug text-[var(--text-muted)]">
            Harga dasar untuk ukuran standar. Mau melon lebih besar? Pilih ukuran di bawah — tambahannya dihitung per kg.
          </p>
          <div className="mt-2.5 grid grid-cols-3 gap-2 sm:grid-cols-5">
            {sizeUnits.map((u) => {
              const habis = u.stokTersedia !== null && u.stokTersedia <= 0;
              const active = u.id === unit.id;
              return (
                <button
                  key={u.id}
                  type="button"
                  disabled={habis}
                  onClick={() => {
                    setSelectedSizeId(u.id);
                    setQty(u.minOrder);
                    setKgInput(String(melonSizeMinKg(u.ukuran!) ?? 0.1));
                  }}
                  className={`flex flex-col items-center rounded-[var(--radius-control)] border p-2.5 text-center transition-colors ${
                    habis
                      ? "cursor-not-allowed border-[var(--border-default)] bg-[var(--surface-disabled)] text-[var(--text-disabled)]"
                      : active
                        ? "border-[var(--border-brand)] bg-[var(--surface-selected)]"
                        : "border-[var(--border-default)] bg-[var(--surface-card)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  <span className={`text-sm font-semibold ${active && !habis ? "text-[var(--text-brand)]" : ""}`}>
                    {u.harga - hargaDasar > 0 ? `+${formatRupiah(u.harga - hargaDasar)}` : "Standar"}
                  </span>
                  <span className="mt-0.5 text-[10.5px] text-[var(--text-subtle)]">{melonSizeRangeLabel(u.ukuran!)}</span>
                  {habis && <span className="mt-1 text-[10px] font-semibold uppercase text-[var(--status-neutral-fg)]">Habis</span>}
                </button>
              );
            })}
          </div>
        </div>
      ) : (
        unitsForGrade.length > 1 && (
          <div>
            <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-subtle)]">Pilih satuan</span>
            <div className="mt-2.5 grid grid-cols-2 gap-2.5">
              {unitsForGrade.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => setQty(u.minOrder)}
                  className="rounded-[var(--radius-control)] border p-3 text-left transition-colors border-[var(--border-brand)] bg-[var(--surface-selected)]"
                >
                  <p className="text-sm font-semibold text-[var(--text-heading)]">{u.satuan}</p>
                  <p className="fh-numeric mt-1 text-[15px] font-semibold text-[var(--text-brand)]">{formatRupiah(Number(u.harga))}</p>
                </button>
              ))}
            </div>
          </div>
        )
      )}

      <div className="rounded-[var(--radius-card)] border border-[var(--border-default)] bg-[var(--surface-card)] p-5">
        {perluTimbang && (
          <div className="mb-4">
            <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)]">Mode beli</span>
            <div className="mt-2 flex gap-2">
              {(["butir", "kg"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setBelanjaMode(m)}
                  className={`rounded-[var(--radius-control)] border px-3.5 py-1.5 text-sm font-semibold transition-colors ${
                    belanjaMode === m
                      ? "border-[var(--border-brand)] bg-[var(--surface-selected)] text-[var(--text-brand)]"
                      : "border-[var(--border-default)] bg-[var(--surface-card)] text-[var(--text-body)] hover:border-[var(--border-strong)]"
                  }`}
                >
                  {m === "butir" ? "Per butir" : "Per kg"}
                </button>
              ))}
            </div>
            <p className="mt-2.5 text-[12.5px] leading-relaxed text-[var(--text-muted)]">
              {belanjaMode === "butir" ? (
                <>
                  Kamu pilih jumlah butir. Berat satu butir {unit.harga - hargaDasar > 0 ? "ukuran ini" : "ukuran standar"} sekitar {melonSizeRangeLabel(unit.ukuran!)}
                  {melonSizeAvgKg(unit.ukuran!) ? ` (rata-rata ±${melonSizeAvgKg(unit.ukuran!)!.toLocaleString("id-ID")} kg)` : ""}.
                  Berat pasti baru diketahui saat ditimbang.
                </>
              ) : (
                <>
                  Isi berat total yang kamu inginkan untuk ukuran ini — ini hanya <strong>saran</strong>. Tim gudang
                  memilihkan melon yang paling mendekati, lalu berat dan harga final mengikuti timbangan aktual.
                </>
              )}{" "}
              Ketersediaan ukuran dikonfirmasi tim kami lewat WhatsApp sebelum tagihan dikirim.
            </p>
          </div>
        )}

        <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
          {perluTimbang && belanjaMode === "kg" ? (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)]">Saran berat (kg)</p>
              <input
                type="number"
                step="0.1"
                min={minKg}
                value={kgInput}
                onChange={(e) => setKgInput(e.target.value)}
                className="h-10 w-32 rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-card)] px-3 text-sm outline-none focus:border-[var(--border-focus)]"
              />
              <p className="mt-1 text-[11px] text-[var(--text-subtle)]">Minimal {minKg} kg (sesuai ukuran yang dipilih)</p>
            </div>
          ) : (
            <div>
              <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)]">
                Jumlah {perluTimbang ? "(butir)" : ""}
              </p>
              <div className="flex w-fit items-center rounded-[var(--radius-control)] border border-[var(--border-default)] bg-[var(--surface-card)]">
                <button
                  type="button"
                  onClick={() => setQty((q) => Math.max(unit.minOrder, q - 1))}
                  className="flex h-10 w-10 items-center justify-center text-[var(--text-brand)] hover:bg-[var(--surface-hover)]"
                  aria-label="Kurangi jumlah"
                >
                  <Minus size={16} strokeWidth={2.25} />
                </button>
                <span className="fh-numeric w-11 text-center text-[15px] font-semibold text-[var(--text-heading)]">{qty}</span>
                <button
                  type="button"
                  onClick={() => setQty((q) => q + 1)}
                  className="flex h-10 w-10 items-center justify-center text-[var(--text-brand)] hover:bg-[var(--surface-hover)]"
                  aria-label="Tambah jumlah"
                >
                  <Plus size={16} strokeWidth={2.25} />
                </button>
              </div>
            </div>
          )}

          <div className="flex-1">
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--text-muted)]">
              {perluTimbang ? (belanjaMode === "kg" ? "Perkiraan harga" : "Harga") : "Subtotal"}
            </p>
            {belumAdaHarga ? (
              <p className="text-[15px] font-medium text-[var(--text-muted)]">Segera hadir</p>
            ) : perluTimbang ? (
              belanjaMode === "kg" ? (
                <p className="fh-numeric text-[22px] font-semibold leading-10 text-[var(--text-heading)]">{formatRupiah(kgTotal)}</p>
              ) : (
                <p className="fh-numeric text-[22px] font-semibold leading-10 text-[var(--text-heading)]">
                  {formatRupiah(Number(unit.harga))}
                  <span className="text-sm font-normal text-[var(--text-muted)]"> /kg</span>
                </p>
              )
            ) : (
              <p className="fh-numeric text-[22px] font-semibold leading-10 text-[var(--text-heading)]">{formatRupiah(total)}</p>
            )}
          </div>

          <button
            type="button"
            disabled={isHabis || sizeHabis || belumAdaHarga || (perluTimbang && belanjaMode === "kg" && kgValue < minKg)}
            onClick={() => {
              const tambah = unit.ukuran ? unit.harga - hargaDasar : 0;
              const namaLengkap = `${nama}${unit.grade ? ` · Grade ${melonGradeLabel(unit.grade)}` : ""}${
                unit.ukuran ? (tambah > 0 ? ` · Upsize ${melonSizeRangeLabel(unit.ukuran)}` : " · Ukuran standar") : ""
              }`;
              if (perluTimbang && belanjaMode === "kg") {
                addItem({
                  productId,
                  saleUnitId: unit.id,
                  nama: namaLengkap,
                  satuan: unit.satuan,
                  harga: Number(unit.harga),
                  minOrder: unit.minOrder,
                  qty: 1,
                  jenisItem,
                  ukuran: unit.ukuran,
                  perluTimbang,
                  kgDiminta: kgValue,
                });
              } else {
                addItem({
                  productId,
                  saleUnitId: unit.id,
                  nama: namaLengkap,
                  satuan: unit.satuan,
                  harga: Number(unit.harga),
                  minOrder: unit.minOrder,
                  qty,
                  jenisItem,
                  ukuran: unit.ukuran,
                  perluTimbang,
                });
              }
              setAdded(true);
            }}
            className="h-[42px] rounded-[var(--radius-control)] bg-[var(--action-primary-bg)] px-6 text-sm font-semibold text-[var(--text-on-brand)] transition-colors hover:bg-[var(--action-primary-bg-hover)] disabled:cursor-not-allowed disabled:bg-[var(--surface-disabled)] disabled:text-[var(--text-disabled)] sm:w-[200px]"
          >
            {isHabis || sizeHabis ? "Stok habis" : belumAdaHarga ? "Segera hadir" : "Tambah ke keranjang"}
          </button>
        </div>

        {(isHabis || sizeHabis) && (
          <button
            type="button"
            disabled={waitlistState !== "idle"}
            onClick={handleKabariSaya}
            className="mt-3 flex h-10 w-full items-center justify-center rounded-[var(--radius-control)] border border-[var(--border-default)] text-sm font-medium text-[var(--text-body)] disabled:opacity-70 sm:w-[200px]"
          >
            {waitlistState === "done" ? "Diingatkan ✓" : waitlistState === "loading" ? "…" : "Kabari saya waktu stok masuk"}
          </button>
        )}

        {!perluTimbang && unit.minOrder > 1 && (
          <p className="mt-3 text-xs text-[var(--text-muted)]">Minimal order {unit.minOrder} {unit.satuan}</p>
        )}
      </div>

      {perluTimbang ? (
        <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">
          Melon ditimbang satu per satu saat dikemas — total harga final dihitung dari berat aktual × harga/kg dan
          dikonfirmasi sales sebelum tagihan dikirim.
        </p>
      ) : (
        estTotalBerat && (
          <p className="text-[13px] leading-relaxed text-[var(--text-muted)]">
            Estimasi berat: ±{estTotalBerat.toFixed(2)} kg — berat final mengikuti timbangan aktual saat pengemasan.
          </p>
        )
      )}

      {added && (
        <div className="flex items-center justify-between rounded-[var(--radius-control)] border border-[var(--status-success-border)] bg-[var(--status-success-bg)] px-4 py-3 text-sm">
          <span className="text-[var(--status-success-fg)]">Ditambahkan ke keranjang.</span>
          <button
            type="button"
            onClick={() => router.push("/keranjang")}
            className="font-semibold text-[var(--text-link)] hover:text-[var(--text-link-hover)]"
          >
            Lihat keranjang →
          </button>
        </div>
      )}
    </div>
  );
}
