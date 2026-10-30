-- CreateEnum
CREATE TYPE "RipenessOption" AS ENUM ('mentah', 'matang', 'pelanggan_pilih');

-- AlterTable
ALTER TABLE "products" ADD COLUMN     "kematangan" "RipenessOption" NOT NULL DEFAULT 'pelanggan_pilih';
