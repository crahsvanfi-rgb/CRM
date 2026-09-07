-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "totalLeadsGenerados" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "segmentoId" UUID;

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'Campaign_segmentoId_fkey'
    ) THEN
        ALTER TABLE "Campaign" ADD CONSTRAINT "Campaign_segmentoId_fkey" FOREIGN KEY ("segmentoId") REFERENCES "Segment"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
END $$;
