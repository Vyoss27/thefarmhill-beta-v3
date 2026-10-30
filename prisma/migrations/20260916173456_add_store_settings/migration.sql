CREATE TABLE IF NOT EXISTS "store_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "nama_gudang" TEXT NOT NULL DEFAULT 'Gudang Cinde Barat, Semarang',
    "alamat_gudang" TEXT NOT NULL DEFAULT '',
    "banks" JSONB NOT NULL DEFAULT '[]',
    "qris_image_url" TEXT NOT NULL DEFAULT '/payment/qris-farmhill.png',
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "store_settings_pkey" PRIMARY KEY ("id")
);
