-- Tingkat harga size melon Perfect berbagi satu kolam stok (SaleUnit Perfect tanpa size).
ALTER TABLE "sale_units" ADD COLUMN "stok_unit_id" UUID;
ALTER TABLE "sale_units" ADD CONSTRAINT "sale_units_stok_unit_id_fkey" FOREIGN KEY ("stok_unit_id") REFERENCES "sale_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
CREATE INDEX "sale_units_stok_unit_id_idx" ON "sale_units"("stok_unit_id");
