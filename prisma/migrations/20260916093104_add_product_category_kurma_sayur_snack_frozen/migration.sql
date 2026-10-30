-- Tambah kategori produk baru (hasil import katalog dari histori penjualan)
ALTER TYPE "ProductCategory" ADD VALUE IF NOT EXISTS 'kurma';
ALTER TYPE "ProductCategory" ADD VALUE IF NOT EXISTS 'sayur';
ALTER TYPE "ProductCategory" ADD VALUE IF NOT EXISTS 'snack';
ALTER TYPE "ProductCategory" ADD VALUE IF NOT EXISTS 'frozen';
