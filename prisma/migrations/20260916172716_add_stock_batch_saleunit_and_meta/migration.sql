ALTER TABLE "stock_batches" ADD COLUMN IF NOT EXISTS "sale_unit_id" UUID;
ALTER TABLE "stock_batches" ADD COLUMN IF NOT EXISTS "catatan" TEXT;
ALTER TABLE "stock_batches" ADD COLUMN IF NOT EXISTS "dicatat_oleh_id" UUID;

ALTER TABLE "stock_batches"
  ADD CONSTRAINT "stock_batches_sale_unit_id_fkey"
  FOREIGN KEY ("sale_unit_id") REFERENCES "sale_units"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "stock_batches"
  ADD CONSTRAINT "stock_batches_dicatat_oleh_id_fkey"
  FOREIGN KEY ("dicatat_oleh_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
