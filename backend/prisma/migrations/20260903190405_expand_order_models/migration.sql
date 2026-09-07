-- AlterTable
ALTER TABLE "Order" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "fechaEsperada" TIMESTAMP(3),
ADD COLUMN     "observaciones" TEXT;
