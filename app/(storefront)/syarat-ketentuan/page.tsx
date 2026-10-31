const SECTIONS = [
  {
    title: "1. Ketentuan Umum",
    body: "Dengan memesan lewat Farmhill Store, kamu setuju sama syarat & ketentuan ini. Farmhill Store berhak mengubah isi halaman ini sewaktu-waktu; perubahan berlaku sejak dipublikasikan.",
  },
  {
    title: "2. Pemesanan & Harga",
    body: "Harga yang tampil di katalog adalah harga per satuan (kg/butir/pack) saat pesanan dibuat. Untuk melon yang dijual per ukuran, harga final dihitung dari berat aktual hasil timbang saat pengemasan, bukan estimasi di keranjang.",
  },
  {
    title: "3. Pembayaran",
    body: "Pembayaran saat ini dilakukan lewat transfer manual atau QRIS ke rekening yang tertera di tagihan, lalu diverifikasi tim Farmhill Store. Tagihan punya batas waktu bayar — kalau lewat batas waktu tanpa konfirmasi, pesanan otomatis dibatalkan.",
  },
  {
    title: "4. Pengiriman",
    body: "Pesanan dikirim sesuai slot tanggal & jam yang dipilih saat checkout dari Gudang Cinde Barat, Semarang. Ongkir dihitung sales setelah pesanan masuk dan dikonfirmasi lewat WhatsApp sebelum pembayaran final.",
  },
  {
    title: "5. Retur & Komplain",
    body: "Kalau produk yang diterima tidak sesuai (rusak, salah kirim, atau kualitas tidak sesuai deskripsi), hubungi sales lewat WhatsApp maksimal 1x24 jam setelah barang diterima, sertakan foto/video sebagai bukti. Penyelesaian (retur, refund, atau ganti barang) ditentukan case-by-case oleh tim Farmhill Store.",
  },
  {
    title: "6. Akun Pelanggan",
    body: "Kamu boleh checkout tanpa akun (isi data lewat WhatsApp) atau daftar akun buat lihat riwayat pesanan lebih gampang. Kamu bertanggung jawab menjaga kerahasiaan akses akunmu.",
  },
];

export default function SyaratKetentuanPage() {
  return (
    <div className="mx-auto max-w-md">
      <h1 className="font-serif text-[28px] font-semibold tracking-[-0.01em] text-[var(--text-heading)]">Syarat &amp; Ketentuan</h1>
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
