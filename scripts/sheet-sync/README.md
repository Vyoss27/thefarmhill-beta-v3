# Sinkron stok in/out: Google Sheet → Supabase

```
Sheet (DATA IN / DATA OUT)  ──Apps Script──▶  POST /api/stock-sync  ──▶  stock_batches / stock_movements
        ▲                                                                       │
        └────────── tab "SALDO APP" ◀── GET /api/stock-sync ◀───────────────────┘
```

- Tim tetap input di **DATA IN** dan **DATA OUT** seperti biasa. Script menambah 3 kolom di kanan tiap tab: `SIZE`, `SYNC_ID`, `SYNC_STATUS`.
- Saldo **tidak dihitung di sheet maupun script** — saldo ada di database. Tab `STOK` lama jalan paralel; tab `SALDO APP` untuk membandingkan.
- Tiap baris punya `SYNC_ID` (UUID) → sinkron aman diulang, tidak akan tercatat dua kali.
- Nama sheet yang beda tapi barangnya sama didaftarkan di `ALIASES` (sekarang: S7 = Amaiame).
- Pesanan dari aplikasi tetap mengurangi stok otomatis. Jangan input penjualan yang sama dua kali (di sheet DAN lewat order app).

## Pasang (sekali)

1. **Migrasi database** (tambah kolom `external_id`) — sudah dijalankan 2026-10-11; perintah ini hanya untuk database lain/baru:
   ```bash
   npx prisma db execute --file prisma/migrations/20261011100000_add_stock_sync_external_id/migration.sql --schema prisma/schema.prisma
   npx prisma migrate resolve --applied 20261011100000_add_stock_sync_external_id
   ```
2. **Secret**: buat string acak, isi sebagai `STOCK_SYNC_SECRET` di `.env.local` dan di Vercel (Production), lalu deploy.
3. **Apps Script**: di sheet buka Extensions → Apps Script, tempel isi `Code.gs`, simpan, reload sheet. Muncul menu **Farmhill Sync**.
4. Menu **1. Setelan**: isi URL (`https://<domain>/api/stock-sync`), secret yang sama, dan `SYNC_FROM` (tanggal mulai, mis. hari cutover).
5. Menu **2. Siapkan sheet**: menambah kolom dan membuat tab `MAP_APP` (varian di sheet → SKU di app, otomatis dicocokkan lewat nama). Isi manual SKU yang kosong — varian tanpa SKU ditolak.
6. Menu **Sinkron sekarang** untuk uji, lalu **3. Jalankan otomatis** (tiap 15 menit).

## Aturan input

| | Aturan |
|---|---|
| Melon grade PERFECT | **SIZE tidak perlu diisi lagi.** Semua stok Perfect masuk ke satu kolam; ukuran (Standar / +Rp8.000 / +Rp16.000 per kg) hanya pilihan harga di toko. Kalau SIZE tetap diisi, barisnya tetap masuk ke kolam yang sama. SIZE yang tidak dikenal → `ERROR`. |
| Melon IMPERFECT / OUTSPEC | SIZE dikosongkan. |
| Produk import (Pack/Butir/Jaring) | SIZE dikosongkan; kolom GRADE (PACK dll.) diabaikan. |
| DATA OUT jenis | Butir & Slice & kosong → `terjual` (jenis aslinya — Butir/Slice — disimpan di catatan buat laporan); Waste Kulit → `waste_kulit`; Waste Tidak Manis → `waste_busuk`; Waste Reject → `waste_reject`. |
| Salah input | Jangan edit baris yang sudah `OK`. Tambah baris koreksi (IN/OUT baru). |
| Copy baris | Aman — `SYNC_ID` salinan otomatis diganti. |

## Status di kolom `SYNC_STATUS`

- `OK` — masuk database. `OK ⚠ …` — masuk, tapi stok tersedia di app jadi negatif (biasanya saldo awal app belum sama dengan sheet; cek tab `SALDO APP`).
- `DUPLIKAT` — ID ini sudah pernah masuk, dilewati.
- `ERROR: …` — ditolak, alasan tertulis. Perbaiki barisnya, otomatis dicoba lagi di sinkron berikutnya.

## Saldo awal

Hanya baris bertanggal ≥ `SYNC_FROM` yang dikirim. Stok app saat ini tidak otomatis sama dengan sheet — putuskan titik mulai: nol-kan stok app lalu masukkan saldo awal sheet sebagai baris DATA IN bertanggal `SYNC_FROM`, atau samakan lewat penyesuaian di halaman admin Stok.
