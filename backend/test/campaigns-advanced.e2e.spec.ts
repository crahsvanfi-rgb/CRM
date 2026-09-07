import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import crypto from 'crypto';

describe('Campañas Avanzadas y Conversión (e2e) - Bloque 4.15 a 4.20', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const tenantA = crypto.randomUUID();
  const tenantB = crypto.randomUUID();
  let userAdminA: string;
  let userVendorA: string;
  let userAdminB: string;

  let customerActiveA: string;
  let customerInactiveA: string;
  let productA: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    // Seed Tenants
    await prisma.tenant.create({ data: { id: tenantA, name: 'Importadora Alfa' } });
    await prisma.tenant.create({ data: { id: tenantB, name: 'Importadora Beta' } });

    // Seed Roles & Users
    const roleAdminA = await prisma.role.create({ data: { tenantId: tenantA, name: 'Admin', permissions: {} } });
    const roleVendorA = await prisma.role.create({ data: { tenantId: tenantA, name: 'Vendedor', permissions: {} } });
    const roleAdminB = await prisma.role.create({ data: { tenantId: tenantB, name: 'Admin', permissions: {} } });

    const adminA = await prisma.user.create({ data: { id: crypto.randomUUID(), email: `admin_${crypto.randomUUID()}@alfa.com`, tenantId: tenantA, roleId: roleAdminA.id } });
    userAdminA = adminA.id;

    const vendorA = await prisma.user.create({ data: { id: crypto.randomUUID(), email: `vendor_${crypto.randomUUID()}@alfa.com`, tenantId: tenantA, roleId: roleVendorA.id } });
    userVendorA = vendorA.id;

    const adminB = await prisma.user.create({ data: { id: crypto.randomUUID(), email: `admin_${crypto.randomUUID()}@beta.com`, tenantId: tenantB, roleId: roleAdminB.id } });
    userAdminB = adminB.id;

    // Seed Product
    const prod = await prisma.product.create({
      data: {
        tenantId: tenantA,
        sku: 'E2E-PROD-01',
        nombre: 'Generador Diésel 10kVA',
        precioVenta: 1200,
        stockMinimo: 5,
      },
    });
    productA = prod.id;

    // Seed Customers en Tenant A
    const custActive = await prisma.customer.create({
      data: {
        tenantId: tenantA,
        nombreComercial: 'Constructora Activa SRL',
        telefono: '+59170111111',
        vendedorId: userVendorA,
        estado: 'ACTIVO',
      },
    });
    customerActiveA = custActive.id;

    const custInactive = await prisma.customer.create({
      data: {
        tenantId: tenantA,
        nombreComercial: 'Minera Los Andes Inactiva',
        telefono: '+59170222222',
        vendedorId: userVendorA,
        estado: 'ACTIVO',
      },
    });
    customerInactiveA = custInactive.id;

    // Pedido antiguo para cliente inactivo (hace 120 días)
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - 120);

    const oldOrder = await prisma.order.create({
      data: {
        tenantId: tenantA,
        numero: 'ORD-OLD-001',
        clienteId: customerInactiveA,
        vendedorId: userVendorA,
        fecha: oldDate,
        total: 5500,
        estado: 'ENTREGADO',
      },
    });

    await prisma.orderItem.create({
      data: {
        tenantId: tenantA,
        orderId: oldOrder.id,
        productId: productA,
        cantidad: 2,
        precioUnitario: 2750,
        total: 5500,
      },
    });

    // Pedido reciente para cliente activo (hace 5 días)
    const recentDate = new Date();
    recentDate.setDate(recentDate.getDate() - 5);

    await prisma.order.create({
      data: {
        tenantId: tenantA,
        numero: 'ORD-REC-001',
        clienteId: customerActiveA,
        vendedorId: userVendorA,
        fecha: recentDate,
        total: 1200,
        estado: 'ENTREGADO',
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    const deleteOps = [
      prisma.campaignMessage.deleteMany(),
      prisma.campaignRecipient.deleteMany(),
      prisma.campaign.deleteMany(),
      prisma.segment.deleteMany(),
      prisma.orderItem.deleteMany(),
      prisma.order.deleteMany(),
      prisma.activity.deleteMany(),
      prisma.lead.deleteMany(),
      prisma.customer.deleteMany(),
      prisma.product.deleteMany(),
      prisma.user.deleteMany(),
      prisma.role.deleteMany(),
      prisma.tenant.deleteMany(),
    ];
    await prisma.$transaction(deleteOps).catch(() => {});
    await app.close();
  });

  let autoRecoveryCampaignId: string;
  let autoProductCampaignId: string;
  let autoVendorCampaignId: string;
  let recipientInactiveId: string;

  describe('1. Campañas Automáticas', () => {
    it('POST /campaigns/auto/recover-inactive - Debe crear campaña de recuperación para clientes inactivos > 90 días', async () => {
      const res = await request(app.getHttpServer())
        .post('/campaigns/auto/recover-inactive')
        .set('x-tenant-id', tenantA)
        .set('x-user-id', userAdminA)
        .set('x-role', 'Admin')
        .send({
          diasInactivo: 90,
          priorizarConIA: false,
          nombre: 'Recuperación E2E Inactivos',
          canal: 'WHATSAPP',
        });

      expect(res.status).toBe(201);
      expect(res.body.campaign).toBeDefined();
      expect(res.body.campaign.tipo).toBe('AUTOMATICA_RECUPERACION');
      expect(res.body.campaign.eventoDisparador).toBe('CLIENTE_INACTIVO');
      expect(res.body.totalDestinatarios).toBeGreaterThanOrEqual(1);

      autoRecoveryCampaignId = res.body.campaign.id;

      // Verificar en base de datos que customerInactiveA fue agregado como destinatario
      const recipient = await prisma.campaignRecipient.findFirst({
        where: { campaignId: autoRecoveryCampaignId, clienteId: customerInactiveA },
      });
      expect(recipient).toBeDefined();
      expect(recipient?.prioridad).toBe('ALTA'); // Total compras 5500 >= 5000
      recipientInactiveId = recipient!.id;
    });

    it('POST /campaigns/auto/product - Debe crear campaña dirigida a compradores de producto', async () => {
      const res = await request(app.getHttpServer())
        .post('/campaigns/auto/product')
        .set('x-tenant-id', tenantA)
        .set('x-user-id', userAdminA)
        .set('x-role', 'Admin')
        .send({
          productoId: productA,
          nombre: 'Campaña Generadores E2E',
          canal: 'WHATSAPP',
        });

      expect(res.status).toBe(201);
      expect(res.body.campaign.tipo).toBe('AUTOMATICA_PRODUCTO');
      expect(res.body.campaign.productoId).toBe(productA);
      expect(res.body.totalDestinatarios).toBeGreaterThanOrEqual(1);

      autoProductCampaignId = res.body.campaign.id;
    });

    it('POST /campaigns/auto/vendor - Vendedor no puede crear para otro vendedor (RBAC)', async () => {
      const res = await request(app.getHttpServer())
        .post('/campaigns/auto/vendor')
        .set('x-tenant-id', tenantA)
        .set('x-user-id', userVendorA)
        .set('x-role', 'Vendedor')
        .send({
          vendedorId: userAdminA, // Diferente al vendedor que ejecuta
          nombre: 'Campaña Cartera Forzada',
        });

      expect(res.status).toBe(403);
    });

    it('POST /campaigns/auto/vendor - Admin puede crear campaña para un vendedor', async () => {
      const res = await request(app.getHttpServer())
        .post('/campaigns/auto/vendor')
        .set('x-tenant-id', tenantA)
        .set('x-user-id', userAdminA)
        .set('x-role', 'Admin')
        .send({
          vendedorId: userVendorA,
          nombre: 'Campaña Cartera Vendedor A',
        });

      expect(res.status).toBe(201);
      expect(res.body.campaign.tipo).toBe('AUTOMATICA_VENDEDOR');
      expect(res.body.campaign.vendedorObjetivoId).toBe(userVendorA);

      autoVendorCampaignId = res.body.campaign.id;
    });
  });

  describe('2. Conversión de Respuestas (processResponse)', () => {
    it('POST /campaigns/:id/process-response - Si el contacto es Cliente existente: crea Actividad y vincula', async () => {
      const res = await request(app.getHttpServer())
        .post(`/campaigns/${autoRecoveryCampaignId}/process-response`)
        .set('x-tenant-id', tenantA)
        .set('x-user-id', userAdminA)
        .send({
          recipientId: recipientInactiveId,
          mensaje: 'Hola, sí me interesa renovar mi equipo.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.resultType).toBe('CUSTOMER_ACTIVITY_CREATED');
      expect(res.body.activityId).toBeDefined();

      // Verificar que la campaña incrementó clientes vinculados y actividades generadas
      const campaign = await prisma.campaign.findUnique({
        where: { id: autoRecoveryCampaignId },
      });
      expect(campaign?.totalRespuestas).toBe(1);
      expect(campaign?.totalClientesVinculados).toBe(1);
      expect(campaign?.totalActividadesGeneradas).toBe(1);
    });

    it('POST /campaigns/:id/process-response - Si el contacto NO es Cliente: crea Lead automáticamente', async () => {
      // Crear un destinatario sin cliente vinculado (simulando un lead de base previa)
      const unlinkedRecipient = await prisma.campaignRecipient.create({
        data: {
          tenantId: tenantA,
          campaignId: autoProductCampaignId,
          motivo: 'Contacto Prospecto',
        },
      });

      const res = await request(app.getHttpServer())
        .post(`/campaigns/${autoProductCampaignId}/process-response`)
        .set('x-tenant-id', tenantA)
        .set('x-user-id', userAdminA)
        .send({
          recipientId: unlinkedRecipient.id,
          mensaje: 'Quiero cotización para 5 unidades.',
        });

      expect(res.status).toBe(201);
      expect(res.body.success).toBe(true);
      expect(res.body.resultType).toBe('LEAD_CREATED_OR_LINKED');
      expect(res.body.leadId).toBeDefined();

      // Verificar que la campaña incrementó leads generados
      const campaign = await prisma.campaign.findUnique({
        where: { id: autoProductCampaignId },
      });
      expect(campaign?.totalRespuestas).toBe(1);
      expect(campaign?.totalLeads).toBe(1);
      expect(campaign?.totalLeadsGenerados).toBe(1);
    });
  });

  describe('3. Bandeja de Campañas (/campaigns/board)', () => {
    it('GET /campaigns/board - Debe listar campañas con métricas agregadas y paginación', async () => {
      const res = await request(app.getHttpServer())
        .get('/campaigns/board?page=1&limit=10')
        .set('x-tenant-id', tenantA)
        .set('x-user-id', userAdminA)
        .set('x-role', 'Admin');

      expect(res.status).toBe(200);
      expect(res.body.data).toBeDefined();
      expect(res.body.data.length).toBeGreaterThanOrEqual(3);
      expect(res.body.meta.total).toBeGreaterThanOrEqual(3);

      const recovery = res.body.data.find((c: any) => c.id === autoRecoveryCampaignId);
      expect(recovery).toBeDefined();
      expect(recovery.totalRespuestas).toBe(1);
      expect(recovery.totalClientesVinculados).toBe(1);
    });

    it('GET /campaigns/board - Filtro por tipo de campaña', async () => {
      const res = await request(app.getHttpServer())
        .get('/campaigns/board?tipo=AUTOMATICA_RECUPERACION')
        .set('x-tenant-id', tenantA)
        .set('x-user-id', userAdminA)
        .set('x-role', 'Admin');

      expect(res.status).toBe(200);
      expect(res.body.data.every((c: any) => c.tipo === 'AUTOMATICA_RECUPERACION')).toBe(true);
    });
  });

  describe('4. Aislamiento Multitenant', () => {
    it('Tenant B no debe ver las campañas creadas en Tenant A', async () => {
      const res = await request(app.getHttpServer())
        .get('/campaigns/board')
        .set('x-tenant-id', tenantB)
        .set('x-user-id', userAdminB)
        .set('x-role', 'Admin');

      expect(res.status).toBe(200);
      expect(res.body.data.length).toBe(0);
      expect(res.body.meta.total).toBe(0);
    });
  });
});
