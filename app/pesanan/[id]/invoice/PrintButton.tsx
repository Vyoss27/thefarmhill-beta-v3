"use client";

export default function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="h-10 rounded-md bg-[#47713A] px-4 text-[13px] font-semibold text-white shadow-sm print:hidden sm:text-sm"
    >
      Cetak / Simpan sebagai PDF
    </button>
  );
}
