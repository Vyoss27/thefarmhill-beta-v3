-- CreateTable
CREATE TABLE "slot_settings" (
    "id" TEXT NOT NULL DEFAULT 'default',
    "kapasitas_pagi" INTEGER NOT NULL DEFAULT 20,
    "kapasitas_sore" INTEGER NOT NULL DEFAULT 20,
    "cutoff_sore_jam" INTEGER NOT NULL DEFAULT 13,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "slot_settings_pkey" PRIMARY KEY ("id")
);
