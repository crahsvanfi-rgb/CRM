import fs from 'fs';

let f = 'prisma/schema.prisma';
let c = fs.readFileSync(f, 'utf8');

const newEnums = `
enum CampaignChannel {
  ZENIOR_FACEBOOK
  ZENIOR_INSTAGRAM
  WHATSAPP
  EMAIL
}

enum CampaignObjective {
  PROMOCION
  RECUPERACION_CLIENTES
  LANZAMIENTO_PRODUCTO
  AVISO_IMPORTACION
  SEGUIMIENTO_COMERCIAL
  FIDELIZACION
  REACTIVACION
  INFORMACION_GENERAL
}

enum CampaignStatus {
  BORRADOR
  PROGRAMADA
  EN_PREPARACION
  ENVIANDO
  PAUSADA
  FINALIZADA
  CANCELADA
  ERROR
}

enum RecipientStatus {
  PENDIENTE
  ENVIADO
  ENTREGADO
  FALLIDO
  RESPONDIDO
}

enum SegmentType {
  CLIENTES
  LEADS
}
`;

const newModels = `
// ------------------------------------------------------
// 13. Marketing: Campañas y Segmentos (Fase 4)
// ------------------------------------------------------

model Campaign {
  id              String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId        String            @db.Uuid
  nombre          String
  descripcion     String?
  canal           CampaignChannel
  objetivo        CampaignObjective
  responsableId   String            @db.Uuid
  estado          CampaignStatus    @default(BORRADOR)
  fechaCreacion   DateTime          @default(now())
  fechaProgramada DateTime?
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  tenant          Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  responsable     User              @relation(fields: [responsableId], references: [id], onDelete: Restrict)
  recipients      CampaignRecipient[]

  @@index([tenantId])
  @@index([estado])
}

model CampaignRecipient {
  id              String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId        String            @db.Uuid
  campaignId      String            @db.Uuid
  clienteId       String?           @db.Uuid
  leadId          String?           @db.Uuid
  estado          RecipientStatus   @default(PENDIENTE)
  motivo          String?
  createdAt       DateTime          @default(now())

  tenant          Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)
  campaign        Campaign          @relation(fields: [campaignId], references: [id], onDelete: Cascade)
  cliente         Customer?         @relation(fields: [clienteId], references: [id], onDelete: SetNull)
  lead            Lead?             @relation(fields: [leadId], references: [id], onDelete: SetNull)

  @@index([tenantId])
  @@index([campaignId])
  @@unique([campaignId, clienteId])
  @@unique([campaignId, leadId])
}

model Segment {
  id              String            @id @default(dbgenerated("gen_random_uuid()")) @db.Uuid
  tenantId        String            @db.Uuid
  nombre          String
  descripcion     String?
  tipoSegmento    SegmentType
  condiciones     Json
  createdAt       DateTime          @default(now())
  updatedAt       DateTime          @updatedAt

  tenant          Tenant            @relation(fields: [tenantId], references: [id], onDelete: Cascade)

  @@index([tenantId])
}
`;

// Inject Enums at the end of the enum list (before first model, e.g. before "model Tenant")
c = c.replace(/\/\/ 1\. Core \/ Multitenancy/g, newEnums + '\n// 1. Core / Multitenancy');

// Inject Models at the end of the file
c += newModels;

// Inject relations to Tenant
c = c.replace(/chatbotConfig    ChatbotConfiguration\?/g, 'chatbotConfig    ChatbotConfiguration?\n  campaigns          Campaign[]\n  campaignRecipients CampaignRecipient[]\n  segments           Segment[]');

// Inject relation to User
c = c.replace(/activities Activity\[\]\n\}/g, 'activities Activity[]\n  campaigns  Campaign[]\n}');

// Inject relation to Customer
c = c.replace(/orders       Order\[\]\n\}/g, 'orders       Order[]\n  campaignRecipients CampaignRecipient[]\n}');

// Inject relation to Lead
c = c.replace(/activities  LeadActivity\[\]\n\}/g, 'activities  LeadActivity[]\n  campaignRecipients CampaignRecipient[]\n}');


fs.writeFileSync(f, c);
console.log('Added schema for Phase 4.1');
