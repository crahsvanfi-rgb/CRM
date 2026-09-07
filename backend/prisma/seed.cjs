const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DEFAULT_TENANT_ID = 'cc5c04c1-5e60-4c54-bacb-6003cbb9cde5';
const DEFAULT_ADMIN_USER_ID = '671fbb0f-afb2-472c-82f8-5c9be494ad29';

async function main() {
  console.log('🌱 Ejecutando seed inicial para CRM SaaS...');

  // 1. Tenant inicial (Empresa por defecto)
  const tenant = await prisma.tenant.upsert({
    where: { id: DEFAULT_TENANT_ID },
    update: {},
    create: {
      id: DEFAULT_TENANT_ID,
      name: 'Importadora Alfa',
      domain: 'alfa.crm.local',
    },
  });
  console.log(`✓ Tenant verificado: ${tenant.name} (${tenant.id})`);

  // 2. Roles del Tenant (Admin y Vendedor)
  const adminRole = await prisma.role.upsert({
    where: {
      tenantId_name: {
        tenantId: tenant.id,
        name: 'Admin',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Admin',
      permissions: {
        all: true,
        leads: ['create', 'read', 'update', 'delete'],
        customers: ['create', 'read', 'update', 'delete'],
        inventory: ['create', 'read', 'update', 'delete'],
        quotes: ['create', 'read', 'update', 'delete'],
        orders: ['create', 'read', 'update', 'delete'],
        importations: ['create', 'read', 'update', 'delete'],
      },
    },
  });
  console.log(`✓ Rol Admin verificado (${adminRole.id})`);

  const vendorRole = await prisma.role.upsert({
    where: {
      tenantId_name: {
        tenantId: tenant.id,
        name: 'Vendedor',
      },
    },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Vendedor',
      permissions: {
        leads: ['create', 'read', 'update'],
        customers: ['create', 'read', 'update'],
        quotes: ['create', 'read'],
        inventory: ['read'],
      },
    },
  });
  console.log(`✓ Rol Vendedor verificado (${vendorRole.id})`);

  // 3. Usuario Administrador por defecto
  const user = await prisma.user.upsert({
    where: { id: DEFAULT_ADMIN_USER_ID },
    update: {
      roleId: adminRole.id,
      tenantId: tenant.id,
    },
    create: {
      id: DEFAULT_ADMIN_USER_ID,
      email: 'admin@alfa.com',
      name: 'Administrador Demo',
      tenantId: tenant.id,
      roleId: adminRole.id,
      isActive: true,
    },
  });
  console.log(`✓ Usuario Admin verificado: ${user.email} (${user.id})`);

  // 4. Configuración de IA por defecto
  await prisma.aIConfiguration.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      provider: 'openrouter',
      apiKey: process.env.OPENROUTER_API_KEY || 'sk-or-placeholder-demo-key',
      defaultModel: 'openai/gpt-4o-mini',
      systemPrompt: 'Eres un asistente inteligente para la gestión de importaciones y ventas de CRM.',
      temperature: 0.7,
      maxTokens: 1000,
      habilitada: true,
    },
  });
  console.log('✓ AIConfiguration inicializada');

  // 5. Configuración de Campañas por defecto
  await prisma.campaignConfig.upsert({
    where: { tenantId: tenant.id },
    update: {},
    create: {
      tenantId: tenant.id,
      campanasActivas: true,
      zeniorConfigurado: false,
      limiteMensajesPorDia: 1000,
      limiteMensajesPorHora: 100,
      intervaloEntreEnviosMs: 1000,
      horarioPermitidoInicio: '09:00',
      horarioPermitidoFin: '19:00',
      costoPorMensajeWhatsapp: 0.05,
      costoPorMensajeSms: 0.02,
      aprobacionObligatoria: false,
      permiteAutomatizaciones: true,
      iaHabilitada: true,
    },
  });
  console.log('✓ CampaignConfig inicializada');

  console.log('🎉 Seed completado exitosamente.');
}

main()
  .catch((e) => {
    console.error('❌ Error en seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
