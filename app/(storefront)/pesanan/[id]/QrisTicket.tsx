import Image from "next/image";

const STEPS = [
  "Buka aplikasi yang bisa scan QRIS",
  "Scan QRIS di atas",
  "Lanjutkan proses pembayaran",
  "Selesai",
  "Kamu juga bisa screenshot kode QRIS untuk permudah pembayaran",
];

export default function QrisTicket({ qrisImageUrl, batasBayar }: { qrisImageUrl: string; batasBayar: string | null }) {
  const deadlineLabel = batasBayar
    ? new Date(batasBayar).toLocaleString("id-ID", { dateStyle: "long", timeStyle: "short", timeZone: "Asia/Jakarta" })
    : null;

  return (
    <div className="rounded-[var(--radius-card)] bg-[var(--surface-sunken)] p-2.5">
      <div className="relative overflow-hidden rounded-[16px] bg-[var(--surface-card)] shadow-[var(--shadow-xs)]">
        <div className="flex flex-col items-center gap-3 px-6 pb-7 pt-6">
          <span className="text-[15px] font-black uppercase tracking-tight text-[var(--text-heading)]">QRIS</span>
          <p className="text-[13.5px] font-semibold text-[var(--text-heading)]">Pindai kode QR untuk membayar</p>
          <div className="relative h-[210px] w-[210px]">
            <Image
              src={qrisImageUrl}
              alt="QRIS Farmhill Store"
              fill
              className="rounded-[var(--radius-control)] border border-[var(--border-default)] bg-white object-contain p-2"
            />
          </div>
          {deadlineLabel && (
            <p className="text-center text-[13px] font-semibold leading-relaxed text-[var(--status-danger-fg)]">
              Waktu pembayaran akan habis pada
              <br />
              {deadlineLabel} WIB
            </p>
          )}
        </div>

        <div className="relative border-t-2 border-dashed border-[var(--border-default)]">
          <span className="absolute -left-[10px] top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-[var(--surface-sunken)]" />
          <span className="absolute -right-[10px] top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-[var(--surface-sunken)]" />
        </div>

        <div className="px-6 py-5">
          <p className="text-[13.5px] font-bold text-[var(--text-heading)]">Cara Pembayaran QRIS</p>
          <ol className="mt-2.5 flex flex-col gap-1.5">
            {STEPS.map((step, i) => (
              <li key={i} className="flex gap-2 text-[13px] leading-relaxed text-[var(--text-body)]">
                <span className="fh-numeric flex-none font-semibold text-[var(--text-muted)]">{i + 1}.</span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </div>
  );
}
