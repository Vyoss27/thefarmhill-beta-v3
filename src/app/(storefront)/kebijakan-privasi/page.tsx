const SECTIONS = [
  {
    title: "1. Data yang Kami Kumpulkan",
    body: "Nama, nomor WhatsApp, alamat pengiriman, dan email (kalau kamu bikin akun) — dipakai buat memproses pesanan, pengiriman, dan komunikasi terkait transaksi.",
  },
  {
    title: "2. Cara Kami Pakai Data",
    body: "Data kamu dipakai buat: konfirmasi pesanan, menghitung ongkir & jadwal kirim, kirim notifikasi status pesanan lewat WhatsApp, dan invoice. Kami tidak menjual data pelanggan ke pihak ketiga.",
  },
  {
    title: "3. Penyimpanan Data",
    body: "Data disimpan di sistem Farmhill Store selama akun/riwayat transaksi kamu masih aktif. Bukti pembayaran (foto transfer) disimpan buat keperluan verifikasi & audit internal.",
  },
  {
    title: "4. Hak Kamu",
    body: "Kamu bisa minta lihat, perbarui, atau hapus data pribadimu lewat menu Detail Akun, atau hubungi sales lewat WhatsApp untuk permintaan yang belum bisa dilakukan sendiri di aplikasi.",
  },
  {
    title: "5. Keamanan",
    body: "Kami berusaha menjaga data kamu tetap aman, tapi belum ada sistem yang 100% bebas risiko — kalau ada kejanggalan di akunmu, segera kabari sales.",
  },
];

export default function KebijakanPrivasiPage() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-serif text-[28px] font-semibold tracking-[-0.01em] text-[var(--text-heading)]">Kebijakan Privasi</h1>
      <p className="mt-1.5 text-[13px] text-[var(--text-subtle)]">Terakhir diperbarui: draf awal, belum final.</p>

      <div className="mt-5 flex flex-col gap-5">
        {SECTIONS.map((s) => (
          <div key={s.title}>
            <h2 className="text-sm font-semibold text-[var(--text-heading)]">{s.title}</h2>
            <p className="mt-1.5 text-[13.5px] leading-relaxed text-[var(--text-body)]">{s.body}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
