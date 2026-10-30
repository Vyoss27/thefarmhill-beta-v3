-- Tambah dimensi ukuran (S/M/L/XL/JB) khusus melon Grade A, + stok per-varian
ALTER TABLE "sale_units" ADD COLUMN IF NOT EXISTS "ukuran" TEXT;

CREATE TABLE IF NOT EXISTS "sale_unit_stock" (
    "sale_unit_id" UUID NOT NULL,
    "jumlah" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "ditahan" DECIMAL(10,2) NOT NULL DEFAULT 0,

    CONSTRAINT "sale_unit_stock_pkey" PRIMARY KEY ("sale_unit_id")
);

ALTER TABLE "sale_unit_stock"
  ADD CONSTRAINT "sale_unit_stock_sale_unit_id_fkey"
  FOREIGN KEY ("sale_unit_id") REFERENCES "sale_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;
