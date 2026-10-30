-- Standardisasi nilai grade melon: "A" -> "perfect", "B" -> "imperfect".
-- Cuma menyentuh baris dengan nilai persis "A"/"B" — nilai lain (mis. "mix" di
-- produk hampers/fruit box) sengaja tidak disentuh, beda konsep sama sekali.
UPDATE "sale_units" SET "grade" = 'perfect' WHERE "grade" = 'A';
UPDATE "sale_units" SET "grade" = 'imperfect' WHERE "grade" = 'B';
UPDATE "stock_batches" SET "grade" = 'perfect' WHERE "grade" = 'A';
UPDATE "stock_batches" SET "grade" = 'imperfect' WHERE "grade" = 'B';

-- Ledger stok keluar/koreksi (pasangan "OUT" dari stock_batches yang sudah ada).
CREATE TYPE "StockMovementKind" AS ENUM ('terjual', 'waste_kulit', 'waste_busuk', 'waste_reject', 'penyesuaian');

CREATE TABLE "stock_movements" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "product_id" UUID NOT NULL,
    "sale_unit_id" UUID,
    "order_id" UUID,
    "jenis" "StockMovementKind" NOT NULL,
    "perubahan" DECIMAL(10, 2) NOT NULL,
    "tanggal" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "catatan" TEXT,
    "dicatat_oleh_id" UUID,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "stock_movements_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "stock_movements_product_id_idx" ON "stock_movements" ("product_id");
CREATE INDEX "stock_movements_sale_unit_id_idx" ON "stock_movements" ("sale_unit_id");

ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_product_id_fkey" FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_sale_unit_id_fkey" FOREIGN KEY ("sale_unit_id") REFERENCES "sale_units"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "stock_movements" ADD CONSTRAINT "stock_movements_dicatat_oleh_id_fkey" FOREIGN KEY ("dicatat_oleh_id") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
