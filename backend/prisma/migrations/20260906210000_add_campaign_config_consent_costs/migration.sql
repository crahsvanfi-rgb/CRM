-- CreateEnum
CREATE TYPE "ContactType" AS ENUM ('CUSTOMER', 'LEAD', 'EXTERNO');

-- CreateEnum
CREATE TYPE "ConsentStatus" AS ENUM ('CONSENTIDO', 'NO_CONSENTIDO', 'PENDIENTE');

-- AlterTable
ALTER TABLE "Campaign" ADD COLUMN IF NOT EXISTS "costoTotal" DECIMAL(10,4) NOT NULL DEFAULT 0;

-- CreateTable
CREATE TABLE IF NOT EXISTS "CampaignConfig" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "campanasActivas" BOOLEAN NOT NULL DEFAULT true,
    "zeniorConfigurado" BOOLEAN NOT NULL DEFAULT false,
    "limiteMensajesPorHora" INTEGER,
    "intervaloEntreEnviosMs" INTEGER NOT NULL DEFAULT 1000,
    "horarioPermitidoInicio" TEXT,
    "horarioPermitidoFin" TEXT,
    "firma" TEXT,
    "mensajePredeterminado" TEXT,
    "aprobacionObligatoria" BOOLEAN NOT NULL DEFAULT true,
    "permiteAutomatizaciones" BOOLEAN NOT NULL DEFAULT true,
    "iaHabilitada" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CampaignConfig_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "Consent" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "contactoId" TEXT NOT NULL,
    "tipoContacto" "ContactType" NOT NULL,
    "estado" "ConsentStatus" NOT NULL DEFAULT 'PENDIENTE',
    "fechaConsentimiento" TIMESTAMP(3),
    "fuenteConsentimiento" TEXT,
    "fechaCambio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "customerId" UUID,
    "leadId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Consent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "OptOut" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "contactoId" TEXT NOT NULL,
    "tipoContacto" "ContactType" NOT NULL,
    "motivo" TEXT,
    "fechaExclusion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "creadoPorId" UUID,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "OptOut_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE IF NOT EXISTS "CampaignCost" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" UUID NOT NULL,
    "campaignId" UUID NOT NULL,
    "mensajesEnviados" INTEGER NOT NULL DEFAULT 0,
    "mensajesFallidos" INTEGER NOT NULL DEFAULT 0,
    "consumo" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "costoEstimado" DECIMAL(10,4) NOT NULL DEFAULT 0,
    "proveedor" TEXT,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CampaignCost_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "CampaignConfig_tenantId_key" ON "CampaignConfig"("tenantId");
CREATE INDEX IF NOT EXISTS "CampaignConfig_tenantId_idx" ON "CampaignConfig"("tenantId");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "Consent_tenantId_idx" ON "Consent"("tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "Consent_tenantId_contactoId_tipoContacto_key" ON "Consent"("tenantId", "contactoId", "tipoContacto");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "OptOut_tenantId_idx" ON "OptOut"("tenantId");
CREATE UNIQUE INDEX IF NOT EXISTS "OptOut_tenantId_contactoId_tipoContacto_key" ON "OptOut"("tenantId", "contactoId", "tipoContacto");

-- CreateIndex
CREATE INDEX IF NOT EXISTS "CampaignCost_tenantId_idx" ON "CampaignCost"("tenantId");
CREATE INDEX IF NOT EXISTS "CampaignCost_campaignId_idx" ON "CampaignCost"("campaignId");

-- AddForeignKey
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CampaignConfig_tenantId_fkey') THEN
        ALTER TABLE "CampaignConfig" ADD CONSTRAINT "CampaignConfig_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Consent_tenantId_fkey') THEN
        ALTER TABLE "Consent" ADD CONSTRAINT "Consent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Consent_customerId_fkey') THEN
        ALTER TABLE "Consent" ADD CONSTRAINT "Consent_customerId_fkey" FOREIGN KEY ("customerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'Consent_leadId_fkey') THEN
        ALTER TABLE "Consent" ADD CONSTRAINT "Consent_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OptOut_tenantId_fkey') THEN
        ALTER TABLE "OptOut" ADD CONSTRAINT "OptOut_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'OptOut_creadoPorId_fkey') THEN
        ALTER TABLE "OptOut" ADD CONSTRAINT "OptOut_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CampaignCost_tenantId_fkey') THEN
        ALTER TABLE "CampaignCost" ADD CONSTRAINT "CampaignCost_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'CampaignCost_campaignId_fkey') THEN
        ALTER TABLE "CampaignCost" ADD CONSTRAINT "CampaignCost_campaignId_fkey" FOREIGN KEY ("campaignId") REFERENCES "Campaign"("id") ON DELETE CASCADE ON UPDATE CASCADE;
    END IF;
END $$;
