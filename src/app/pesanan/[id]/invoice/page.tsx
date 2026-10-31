import Image from "next/image";
import { notFound } from "next/navigation";
import { db } from "@/lib/db";
import { formatRupiah } from "@/lib/catalog";
import { getStoreSetting } from "@/lib/store-settings";
import { tanggalDenganJam } from "@/lib/slot";
import { melonGradeLabel } from "@/lib/melon-grade";
import PrintButton from "./PrintButton";

const METODE_TERIMA_LABEL: Record<string, string> = {
  driver: "Diantar driver",
  ambil_sendiri: "Ambil di gudang",
  ekspedisi: "Ekspedisi pihak ke-3",
};

export default async function InvoicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const order = await db.order.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { include: { saleUnit: { include: { product: true } } } },
      payments: { orderBy: { waktu: "desc" } },
    },
  });

  if (!order) notFound();
  const setting = await getStoreSetting();

  const lunas = order.payments.some((p) => p.status === "verified");
  const belumLunas = !lunas && order.status !== "dibatalkan" && order.status !== "kedaluwarsa";

  const watermark = lunas
    ? "LUNAS"
    : order.status === "kedaluwarsa"
      ? "KEDALUWARSA"
      : order.status === "dibatalkan"
        ? "DIBATALKAN"
        : null;

  const tanggalInvoice = order.createdAt.toLocaleDateString("id-ID", { dateStyle: "long", timeZone: "Asia/Jakarta" });
  const tanggalKirim = order.tanggalSlot.toLocaleDateString("id-ID", { dateStyle: "long", timeZone: "UTC" });

  return (
    <div className="relative mx-auto min-h-screen max-w-[820px] overflow-hidden bg-white px-6 py-10 text-[#2E2318] print:max-w-none print:px-8 print:py-0">
      <style>{`
        @media print {
          html, body { background: #fff !important; }
        }
      `}</style>

      {watermark && (
        <p
          aria-hidden
          className="pointer-events-none absolute left-1/2 top-[300px] z-0 -translate-x-1/2 -translate-y-1/2 -rotate-[22deg] whitespace-nowrap text-[min(20vw,90px)] font-black uppercase tracking-wide text-[#2E2318]/[0.07] sm:text-[80px]"
        >
          {watermark}
        </p>
      )}

      <div className="relative z-10">
      <div className="mb-5 flex justify-end print:hidden">
        <PrintButton />
      </div>

      <div className="flex items-start justify-between border-b-2 border-[#2E2318] pb-6">
        <div>
          <Image src="/logo-farmhill-store.png" alt="Farmhill Store" width={160} height={40} className="h-9 w-auto" />
          <p className="mt-3 text-[13px] leading-relaxed text-[#6B573F]">
            {setting.namaGudang}
            <br />
            PT Kebun Bumi Lestari
          </p>
        </div>
        <div className="text-right">
          <h1 className="font-serif text-[28px] font-bold tracking-tight">INVOICE</h1>
          <p className="mt-1 font-mono text-[13px] text-[#6B573F]">#{order.id.slice(0, 8).toUpperCase()}</p>
          <p className="mt-0.5 text-[13px] text-[#6B573F]">{tanggalInvoice}</p>
          <span
            className={`mt-2 inline-block rounded px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${
              lunas ? "bg-[#EDF5EC] text-[#2A5527]" : belumLunas ? "bg-[#FEF4EB] text-[#9A4616]" : "bg-[#F5EFE2] text-[#55432F]"
            }`}
          >
            {lunas ? "Lunas" : belumLunas ? "Belum lunas" : order.status.replace(/_/g, " ")}
          </span>
        </div>
      </div>

      <div className="mt-6 grid grid-cols-2 gap-6">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8A755C]">Ditagihkan kepada</p>
          <p className="mt-1 text-[15px] font-semibold">{order.customer.nama}</p>
          <p className="text-[13px] text-[#6B573F]">{order.customer.wa}</p>
          {order.customer.alamat && <p className="text-[13px] text-[#6B573F]">{order.customer.alamat}</p>}
        </div>
        <div className="text-right">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[#8A755C]">Pengiriman</p>
          <p className="mt-1 text-[13px] text-[#3F3123]">{METODE_TERIMA_LABEL[order.metodeTerima] ?? order.metodeTerima}</p>
          <p className="text-[13px] text-[#6B573F]">
            {tanggalDenganJam(tanggalKirim, order.jamSlot)}
          </p>
        </div>
      </div>

      <table className="mt-8 w-full border-collapse text-[13.5px]">
        <thead>
          <tr className="border-b-2 border-[#2E2318] text-left text-[11px] font-semibold uppercase tracking-wide text-[#8A755C]">
            <th className="pb-2">Item</th>
            <th className="pb-2 text-right">Qty</th>
            <th className="pb-2 text-right">Harga satuan</th>
            <th className="pb-2 text-right">Subtotal</th>
          </tr>
        </thead>
        <tbody>
          {order.items.map((item) => {
            const perluTimbang = !!item.saleUnit.ukuran;
            const qtyLabel = perluTimbang
              ? item.beratAktual
                ? `${Number(item.beratAktual)} kg`
                : "menunggu ditimbang"
              : `${item.qty.toString()} ${item.saleUnit.satuan}`;
            const jumlah = perluTimbang
              ? item.beratAktual
                ? Number(item.hargaSaatPesan) * Number(item.beratAktual)
                : null
              : Number(item.hargaSaatPesan) * Number(item.qty);
            return (
              <tr key={item.id} className="border-b border-[#E5DDD2]">
                <td className="py-2.5">
                  {item.saleUnit.product.nama}
                  {item.saleUnit.grade && <span className="text-[#8A755C]"> · Grade {melonGradeLabel(item.saleUnit.grade)}</span>}
                  {item.saleUnit.ukuran && <span className="text-[#8A755C]"> · Size {item.saleUnit.ukuran}</span>}
                  {item.butirDiminta && <span className="text-[#8A755C]"> ({item.butirDiminta} butir)</span>}
                </td>
                <td className="fh-numeric py-2.5 text-right">{qtyLabel}</td>
                <td className="fh-numeric py-2.5 text-right">{formatRupiah(Number(item.hargaSaatPesan))}{perluTimbang ? "/kg" : ""}</td>
                <td className="fh-numeric py-2.5 text-right font-semibold">{jumlah !== null ? formatRupiah(jumlah) : "—"}</td>
              </tr>
            );
          })}
        </tbody>
      </table>

      <div className="ml-auto mt-4 flex w-full max-w-[280px] flex-col gap-1.5 text-[13.5px]">
        <div className="flex justify-between">
          <span className="text-[#6B573F]">Subtotal</span>
          <span className="fh-numeric font-medium">{formatRupiah(Number(order.subtotal))}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-[#6B573F]">Ongkir</span>
          <span className="fh-numeric font-medium">{order.ongkir !== null ? formatRupiah(Number(order.ongkir)) : "Menyusul"}</span>
        </div>
        {Number(order.diskon) > 0 && (
          <div className="flex justify-between">
            <span className="text-[#6B573F]">Diskon</span>
            <span className="fh-numeric font-medium">−{formatRupiah(Number(order.diskon))}</span>
          </div>
        )}
        <div className="mt-1 flex justify-between border-t-2 border-[#2E2318] pt-2 text-[16px] font-bold">
          <span>Total</span>
          <span className="fh-numeric">{formatRupiah(Number(order.total))}</span>
        </div>
      </div>

      {belumLunas && (
        <div className="mt-10 rounded-md bg-[#F5EFE2] p-5">
          <p className="text-[12px] font-semibold uppercase tracking-wide text-[#8A755C]">Cara pembayaran</p>
          <div className="mt-2 flex flex-wrap items-start gap-6">
            <div className="flex flex-col gap-2">
              <p className="text-[13.5px] font-semibold">Transfer bank</p>
              {setting.banks.map((bank) => (
                <div key={bank.nama}>
                  <p className="fh-numeric text-[13.5px]">
                    {bank.nama} {bank.noRekening}
                  </p>
                  <p className="text-[13.5px] text-[#6B573F]">a.n. {bank.atasNama}</p>
                </div>
              ))}
            </div>
            <div>
              <p className="text-[13.5px] font-semibold">QRIS</p>
              <p className="text-[13.5px] text-[#6B573F]">Scan lewat halaman lacak pesanan untuk kode QRIS.</p>
            </div>
          </div>
        </div>
      )}

      <p className="mt-10 border-t border-[#E5DDD2] pt-4 text-center text-[12px] text-[#8A755C]">
        Invoice ini dibuat otomatis oleh sistem Farmhill Store — bukan bukti pembayaran resmi bermaterai.
      </p>
      </div>
    </div>
  );
}
