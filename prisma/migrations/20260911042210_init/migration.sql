-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('admin', 'sales');

-- CreateEnum
CREATE TYPE "CustomerSegment" AS ENUM ('rumah_tangga', 'kafe', 'reseller');

-- CreateEnum
CREATE TYPE "ProductCategory" AS ENUM ('melon', 'buah', 'buah_potong', 'paket', 'paket_melon', 'minuman');

-- CreateEnum
CREATE TYPE "ProductStatus" AS ENUM ('aktif', 'draft', 'habis');

-- CreateEnum
CREATE TYPE "RoundingRule" AS ENUM ('nearest_100g', 'round_down', 'none');

-- CreateEnum
CREATE TYPE "WeightTolerance" AS ENUM ('persen_5', 'persen_10', 'always_confirm');

-- CreateEnum
CREATE TYPE "OrderStatus" AS ENUM ('menunggu_konfirmasi', 'menunggu_bayar', 'diproses', 'dikirim', 'selesai', 'dibatalkan', 'kedaluwarsa');

-- CreateEnum
CREATE TYPE "FulfillmentMethod" AS ENUM ('driver', 'ambil_sendiri', 'ekspedisi');

-- CreateEnum
CREATE TYPE "PaymentMethod" AS ENUM ('transfer_manual', 'qris', 'e_wallet', 'va', 'cod');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('pending', 'verified', 'rejected');

-- CreateEnum
CREATE TYPE "VoucherType" AS ENUM ('nominal', 'persen');

-- CreateTable
CREATE TABLE "users" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nama" TEXT NOT NULL,
    "kontak" TEXT NOT NULL,
    "role" "UserRole" NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "customers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nama" TEXT NOT NULL,
    "wa" TEXT NOT NULL,
    "alamat" TEXT,
    "segmen" "CustomerSegment",
    "preferensi_kematangan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "customers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "products" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "nama" TEXT NOT NULL,
    "sku" TEXT NOT NULL,
    "jenis_item" "ProductCategory" NOT NULL,
    "asal_kebun" TEXT,
    "deskripsi" TEXT,
    "pembulatan_berat" "RoundingRule" NOT NULL DEFAULT 'nearest_100g',
    "toleransi_selisih" "WeightTolerance" NOT NULL DEFAULT 'persen_10',
    "ambang_stok_tipis" DECIMAL(10,2),
    "est_panen_berikutnya" DATE,
    "status" "ProductStatus" NOT NULL DEFAULT 'draft',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "products_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "product_photos" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "url" TEXT NOT NULL,
    "urutan" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "product_photos_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "sale_units" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "satuan" TEXT NOT NULL,
    "grade" TEXT,
    "harga" DECIMAL(12,2) NOT NULL,
    "conv_ke_kg" DECIMAL(10,4),
    "est_berat" DECIMAL(10,2),
    "min_order" INTEGER NOT NULL DEFAULT 1,

    CONSTRAINT "sale_units_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock_batches" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "tanggal_masuk" DATE NOT NULL,
    "best_before" DATE,
    "grade" TEXT,
    "brix" DECIMAL(5,2),
    "jumlah" DECIMAL(10,2) NOT NULL,
    "lokasi_simpan" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_batches_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "stock" (
    "product_id" UUID NOT NULL,
    "jumlah" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "ditahan" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "ambang_kritis" DECIMAL(10,2),

    CONSTRAINT "stock_pkey" PRIMARY KEY ("product_id")
);

-- CreateTable
CREATE TABLE "orders" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "customer_id" UUID NOT NULL,
    "sales_id" UUID,
    "status" "OrderStatus" NOT NULL DEFAULT 'menunggu_konfirmasi',
    "subtotal" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "ongkir" DECIMAL(12,2),
    "diskon" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "total" DECIMAL(12,2) NOT NULL DEFAULT 0,
    "tanggal_slot" DATE NOT NULL,
    "jam_slot" TEXT NOT NULL,
    "metode_terima" "FulfillmentMethod" NOT NULL,
    "metode_bayar" "PaymentMethod",
    "batas_bayar" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "orders_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "order_items" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "sale_unit_id" UUID NOT NULL,
    "qty" DECIMAL(10,2) NOT NULL,
    "berat_aktual" DECIMAL(10,2),
    "harga_saat_pesan" DECIMAL(12,2) NOT NULL,

    CONSTRAINT "order_items_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "payments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "verifikator_id" UUID,
    "metode" "PaymentMethod" NOT NULL,
    "nominal" DECIMAL(12,2) NOT NULL,
    "bukti_url" TEXT,
    "status" "PaymentStatus" NOT NULL DEFAULT 'pending',
    "waktu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "payments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "shipments" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "order_id" UUID NOT NULL,
    "driver_nama" TEXT,
    "slot" TEXT,
    "bukti_serah_terima_url" TEXT,
    "delivered_at" TIMESTAMP(3),

    CONSTRAINT "shipments_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "vouchers" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "kode" TEXT NOT NULL,
    "tipe" "VoucherType" NOT NULL,
    "nilai" DECIMAL(12,2) NOT NULL,
    "kuota" INTEGER,
    "minimal_belanja" DECIMAL(12,2),
    "mulai" DATE,
    "berakhir" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "vouchers_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "voucher_usage" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "voucher_id" UUID NOT NULL,
    "order_id" UUID NOT NULL,

    CONSTRAINT "voucher_usage_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "waitlist" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "customer_id" UUID NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "notified_at" TIMESTAMP(3),

    CONSTRAINT "waitlist_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "action_logs" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "entitas" TEXT NOT NULL,
    "entitas_id" UUID NOT NULL,
    "actor_id" UUID,
    "aksi" TEXT NOT NULL,
    "nilai_lama" JSONB,
    "nilai_baru" JSONB,
    "waktu" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "action_logs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "users_kontak_key" ON "users"("kontak");

-- CreateIndex
CREATE UNIQUE INDEX "customers_wa_key" ON "customers"("wa");

-- CreateIndex
CREATE UNIQUE INDEX "products_sku_key" ON "products"("sku");

-- CreateIndex
CREATE INDEX "orders_status_idx" ON "orders"("status");

-- CreateIndex
CREATE INDEX "orders_tanggal_slot_idx" ON "orders"("tanggal_slot");

-- CreateIndex
CREATE UNIQUE INDEX "shipments_order_id_key" ON "shipments"("order_id");

-- CreateIndex
CREATE UNIQUE INDEX "vouchers_kode_key" ON "vouchers"("kode");

-- CreateIndex
CREATE UNIQUE INDEX "voucher_usage_voucher_id_order_id_key" ON "voucher_usage"("voucher_id", "order_id");

-- CreateIndex
CREATE UNIQUE INDEX "waitlist_product_id_customer_id_key" ON "waitlist"("product_id", "customer_id");

-- CreateIndex
CREATE INDEX "action_logs_entitas_entitas_id_idx" ON "action_logs"("entitas", "entitas_id");

-- AddForeignKey
ALTER TABLE "product_photos" ADD CONSTRAINT "product_photos_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "sale_units" ADD CONSTRAINT "sale_units_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock_batches" ADD CONSTRAINT "stock_batches_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "stock" ADD CONSTRAINT "stock_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "orders" ADD CONSTRAINT "orders_sales_id_fkey" FOREIGN KEY ("sales_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "order_items" ADD CONSTRAINT "order_items_sale_unit_id_fkey" FOREIGN KEY ("sale_unit_id") REFERENCES "sale_units"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "payments" ADD CONSTRAINT "payments_verifikator_id_fkey" FOREIGN KEY ("verifikator_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "shipments" ADD CONSTRAINT "shipments_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_usage" ADD CONSTRAINT "voucher_usage_voucher_id_fkey" FOREIGN KEY ("voucher_id") REFERENCES "vouchers"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "voucher_usage" ADD CONSTRAINT "voucher_usage_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "waitlist" ADD CONSTRAINT "waitlist_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "action_logs" ADD CONSTRAINT "action_logs_actor_id_fkey" FOREIGN KEY ("actor_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
