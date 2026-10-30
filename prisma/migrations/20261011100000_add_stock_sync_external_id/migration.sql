-- ID unik dari sumber luar (Google Sheet) supaya sinkron bisa diulang tanpa mencatat
-- baris yang sama dua kali. Null = dicatat lewat form admin/order di aplikasi.
ALTER TABLE "stock_batches" ADD COLUMN "external_id" TEXT;
ALTER TABLE "stock_movements" ADD COLUMN "external_id" TEXT;

CREATE UNIQUE INDEX "stock_batches_external_id_key" ON "stock_batches" ("external_id");
CREATE UNIQUE INDEX "stock_movements_external_id_key" ON "stock_movements" ("external_id");
