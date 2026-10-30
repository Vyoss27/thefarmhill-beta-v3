# Farmhill Store — web app

Referensi cepat untuk kerja di repo ini. Detail lengkap ada di PRD (`../PRD - Farmhill Store.dc.html` atau `.pdf`) dan ERD (artifact: lihat link di `prisma/schema.prisma`).

## Stack

- **Next.js 15 (App Router, TypeScript, Tailwind v4)** — storefront + panel admin/sales dalam satu codebase.
- **Prisma + PostgreSQL (Supabase)** — lihat `prisma/schema.prisma`, 14 model mengikuti PRD section 9.
- **Supabase** — Auth (login admin/sales, bukan akun pelanggan), Storage (foto produk & bukti transfer), Realtime (chat in-app & status pesanan live).
- **Midtrans** — payment gateway (QRIS, VA, e-wallet dalam satu Snap token). Transfer manual & COD ditangani manual di aplikasi.
- **WhatsApp gateway (Fonnte/Wablas)** — notifikasi ke pelanggan & sales. Bukan Meta Cloud API langsung untuk MVP.

## Struktur folder

```
src/
  app/
    (storefront)/   # katalog, keranjang, checkout, lacak pesanan — publik, tanpa akun
    admin/           # dashboard, produk, stok, pesanan, dst — dijaga middleware.ts
    api/             # route handler: webhook Midtrans, webhook WA, cron expire
  lib/
    supabase/        # client.ts (browser), server.ts (server component/action)
    db.ts            # Prisma client singleton
  middleware.ts      # refresh session Supabase + guard /admin/*
prisma/
  schema.prisma
```

## Aturan bisnis penting (jangan lupa saat implementasi)

- **BR-01 Ongkir**: `Order.ongkir` null sampai sales isi manual — tombol bayar disabled selama itu. Ada bantuan hitung otomatis (tombol "Hitung otomatis" di form konfirmasi, `src/lib/google-maps.ts`) berdasar jarak jalan dari gudang (Distance Matrix API, butuh `GOOGLE_MAPS_API_KEY`): ≤10km gratis ongkir, di atas itu Rp2.500/km untuk kelebihan jaraknya saja (bukan jarak penuh). Sales tetap bisa timpa manual — ini cuma estimasi, bukan tarif final yang mengikat.
- **BR-03 Slot**: cut-off jam 13.00 untuk slot sore hari yang sama. Validasi di server, bukan cuma UI.
- **BR-04 Batas bayar**: 1 hari (24 jam) sejak tagihan terkirim (`Order.batasBayar`) — diubah dari 2 jam karena Vercel Cron di plan Hobby cuma bisa jalan 1x/hari, jadi jendela bayar disamakan skalanya biar auto-cancel-nya masuk akal. Perlu cron job yang set status → `kedaluwarsa` dan release `Stock.ditahan`.
- **BR-05 Berat aktual**: `OrderItem.beratAktual` dibanding `estBerat` × toleransi produk. Di luar toleransi → butuh konfirmasi sales sebelum lanjut ke shipment.
- **BR-06 Stok habis**: produk tetap tayang dengan status `habis`, bukan disembunyikan. Entry `Waitlist` dinotif saat `StockBatch` baru masuk untuk produk itu.
- **BR-07 Wewenang sales**: sales boleh ubah `ongkir`/`diskon`/slot & confirm order, tidak boleh ubah `SaleUnit.harga` atau data master produk — enforce lewat RLS policy Supabase, bukan cuma hide di UI.
- Semua perubahan ongkir/diskon/stok wajib nulis `ActionLog` — tidak ada UPDATE tanpa log.

## Environment

Copy `.env.example` → `.env.local`, isi dari Supabase project settings (Database + API) dan Midtrans dashboard.

## Perintah

```bash
npm run dev              # dev server
npx prisma migrate dev   # apply schema ke DB (butuh DATABASE_URL & DIRECT_URL terisi)
npx prisma studio        # browse data
```
