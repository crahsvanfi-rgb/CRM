import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AiToolsService } from '../src/modules/ai-chat/ai-tools.service.js';
import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import crypto from 'crypto';

describe('Cierre de Fase 4 (e2e) - Bloques 4.25 a 4.30: Roles, Auditoría, Entidades, Dashboard e IA', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let aiToolsService: AiToolsService;

  const tenantId = crypto.randomUUID();
  let adminUserId: string;
  let gerenteUserId: string;
  let vendorUserId: string;
  let basicUserId: string;

  let vendorCustomerId: string;
  let otherCustomerId: string;
  let testCampaignId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    aiToolsService = app.get(AiToolsService);

    // 1. Crear Tenant
    await prisma.tenant.create({
      data: { id: tenantId, name: 'Importadora Global Closure S.A.' }
    });

    // 2. Roles y Usuarios
    const roleAdmin = await prisma.role.create({ data: { tenantId, name: 'Admin', permissions: {} } });
    const roleGerente = await prisma.role.create({ data: { tenantId, name: 'Gerente', permissions: {} } });
    const roleVendor = await prisma.role.create({ data: { tenantId, name: 'Vendedor', permissions: {} } });
    const roleUser = await prisma.role.create({ data: { tenantId, name: 'User', permissions: {} } });

    const admin = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: `admin_${crypto.randomUUID()}@global.com`,
        name: 'Administrador Principal',
        tenantId,
        roleId: roleAdmin.id
      }
    });
    adminUserId = admin.id;

    const gerente = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: `gerente_${crypto.randomUUID()}@global.com`,
        name: 'Gerente Comercial',
        tenantId,
        roleId: roleGerente.id
      }
    });
    gerenteUserId = gerente.id;

    const vendor = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: `vendor_${crypto.randomUUID()}@global.com`,
        name: 'Vendedor 1',
        tenantId,
        roleId: roleVendor.id
      }
    });
    vendorUserId = vendor.id;

    const basicUser = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: `user_${crypto.randomUUID()}@global.com`,
        name: 'Usuario Consulta',
        tenantId,
        roleId: roleUser.id
      }
    });
    basicUserId = basicUser.id;

    // 3. Crear Clientes: uno asignado al vendedor y otro a otro usuario
    const c1 = await prisma.customer.create({
      data: {
        tenantId,
        nitCi: `NIT-${crypto.randomUUID().slice(0, 8)}`,
        razonSocial: 'Cliente Vendedor 1 S.R.L.',
        nombreComercial: 'Cliente Vendedor',
        telefono: '+59171111111',
        vendedorId: vendorUserId,
        estado: 'ACTIVO'
      }
    });
    vendorCustomerId = c1.id;

    const c2 = await prisma.customer.create({
      data: {
        tenantId,
        nitCi: `NIT-${crypto.randomUUID().slice(0, 8)}`,
        razonSocial: 'Cliente Ajeno S.A.',
        nombreComercial: 'Cliente Ajeno',
        telefono: '+59172222222',
        vendedorId: adminUserId,
        estado: 'ACTIVO'
      }
    });
    otherCustomerId = c2.id;
  });

  afterAll(async () => {
    try {
      await prisma.campaignEvent.deleteMany({ where: { tenantId } }).catch(() => {});
      await prisma.campaignExecution.deleteMany({ where: { tenantId } }).catch(() => {});
      await prisma.campaignCost.deleteMany({ where: { tenantId } }).catch(() => {});
      await prisma.campaignMessage.deleteMany({ where: { tenantId } }).catch(() => {});
      await prisma.campaignRecipient.deleteMany({ where: { tenantId } }).catch(() => {});
      await prisma.campaign.deleteMany({ where: { tenantId } }).catch(() => {});
      await prisma.segment.deleteMany({ where: { tenantId } }).catch(() => {});
      await prisma.campaignTemplate.deleteMany({ where: { tenantId } }).catch(() => {});
      await prisma.auditLog.deleteMany({ where: { tenantId } }).catch(() => {});
      await prisma.customer.deleteMany({ where: { tenantId } }).catch(() => {});
      await prisma.user.deleteMany({ where: { tenantId } }).catch(() => {});
      await prisma.role.deleteMany({ where: { tenantId } }).catch(() => {});
      await prisma.tenant.deleteMany({ where: { id: tenantId } }).catch(() => {});
    } catch (e) {
      console.error('Error en teardown:', e);
    }
    await app.close();
  });

  // ==========================================
  // BLOQUE 4.25: ROLES Y PERMISOS DE CAMPAÑAS
  // ==========================================
  describe('4.25 Roles y Permisos para Campañas', () => {
    it('Usuario Básico (User) NO puede crear campañas (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post('/campaigns')
        .set('x-tenant-id', tenantId)
        .set('x-user-id', basicUserId)
        .set('x-role', 'user')
        .send({
          nombre: 'Campaña No Autorizada',
          canal: 'WHATSAPP',
          objetivo: 'VENTAS',
          responsableId: basicUserId
        })
        .expect(403);
    });

    it('Vendedor solo puede crear campañas asignadas a sí mismo', async () => {
      // 1. Intentar crear a nombre de admin (Debe fallar con 403)
      await request(app.getHttpServer())
        .post('/campaigns')
        .set('x-tenant-id', tenantId)
        .set('x-user-id', vendorUserId)
        .set('x-role', 'vendedor')
        .send({
          nombre: 'Campaña Vendedor Ilegal',
          canal: 'WHATSAPP',
          objetivo: 'VENTAS',
          responsableId: adminUserId
        })
        .expect(403);

      // 2. Crear a nombre de sí mismo (Debe tener éxito con 201)
      const res = await request(app.getHttpServer())
        .post('/campaigns')
        .set('x-tenant-id', tenantId)
        .set('x-user-id', vendorUserId)
        .set('x-role', 'vendedor')
        .send({
          nombre: 'Campaña Propia de Vendedor',
          descripcion: 'Campaña solo para sus clientes',
          canal: 'WHATSAPP',
          objetivo: 'VENTAS',
          responsableId: vendorUserId
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.responsableId).toBe(vendorUserId);
      testCampaignId = res.body.id;
    });

    it('Vendedor solo puede agregar a sus clientes a su campaña', async () => {
      // Intentar agregar cliente de otro vendedor (Debe fallar 403)
      await request(app.getHttpServer())
        .post(`/campaigns/${testCampaignId}/recipients/manual`)
        .set('x-tenant-id', tenantId)
        .set('x-user-id', vendorUserId)
        .set('x-role', 'vendedor')
        .send({
          clienteIds: [otherCustomerId]
        })
        .expect(403);

      // Agregar a su propio cliente (Debe tener éxito 201)
      const res = await request(app.getHttpServer())
        .post(`/campaigns/${testCampaignId}/recipients/manual`)
        .set('x-tenant-id', tenantId)
        .set('x-user-id', vendorUserId)
        .set('x-role', 'vendedor')
        .send({
          clienteIds: [vendorCustomerId]
        })
        .expect(201);

      expect(res.body.agregados).toBe(1);
    });

    it('Vendedor NO puede aprobar campañas (403 Forbidden)', async () => {
      await request(app.getHttpServer())
        .post(`/campaigns/${testCampaignId}/approve`)
        .set('x-tenant-id', tenantId)
        .set('x-user-id', vendorUserId)
        .set('x-role', 'vendedor')
        .expect(403);
    });

    it('Gerente o Admin SÍ puede aprobar campañas (200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .post(`/campaigns/${testCampaignId}/approve`)
        .set('x-tenant-id', tenantId)
        .set('x-user-id', gerenteUserId)
        .set('x-role', 'gerente')
        .expect(201);

      expect(res.body.aprobada).toBe(true);
    });

    it('Usuario Básico SÍ puede consultar campañas en modo lectura (200 OK)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/campaigns/${testCampaignId}`)
        .set('x-tenant-id', tenantId)
        .set('x-user-id', basicUserId)
        .set('x-role', 'user')
        .expect(200);

      expect(res.body.id).toBe(testCampaignId);
    });
  });

  // ==========================================
  // BLOQUE 4.26: AUDITORÍA DE ACCIONES DE CAMPAÑAS
  // ==========================================
  describe('4.26 Auditoría de Acciones de Campañas', () => {
    it('Debe registrar eventos de auditoría (CAMPAIGN_CREATED, CAMPAIGN_APPROVED)', async () => {
      const logs = await prisma.auditLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'desc' }
      });

      expect(logs.length).toBeGreaterThan(0);
      const actions = logs.map(l => l.action);
      expect(actions.some(a => a.includes('CAMPAIGN_CREATED'))).toBe(true);
      expect(actions.some(a => a.includes('CAMPAIGN_APPROVED'))).toBe(true);
    });
  });

  // ==========================================
  // BLOQUE 4.27: ENTIDADES DE BASE DE DATOS (CampaignExecution, CampaignEvent)
  // ==========================================
  describe('4.27 Consolidación de Entidades (CampaignExecution y CampaignEvent)', () => {
    it('Debe crear y consultar ejecuciones y eventos vinculados a la campaña', async () => {
      // 1. Crear CampaignExecution
      const execution = await prisma.campaignExecution.create({
        data: {
          tenantId,
          campaignId: testCampaignId,
          estado: 'COMPLETADA',
          totalDestinatarios: 1,
          totalEnviados: 1,
          totalFallidos: 0
        }
      });
      expect(execution.id).toBeDefined();
      expect(execution.campaignId).toBe(testCampaignId);

      // 2. Crear CampaignEvent
      const event = await prisma.campaignEvent.create({
        data: {
          tenantId,
          campaignId: testCampaignId,
          tipoEvento: 'RESPUESTA',
          detalles: { canal: 'WHATSAPP', texto: 'Me interesa el catálogo' }
        }
      });
      expect(event.id).toBeDefined();
      expect(event.tipoEvento).toBe('RESPUESTA');
    });
  });

  // ==========================================
  // BLOQUE 4.28: DASHBOARD DE MARKETING
  // ==========================================
  describe('4.28 Dashboard de Marketing (/dashboard/marketing-summary)', () => {
    it('GET /dashboard/marketing-summary - Retorna métricas ejecutivas de marketing', async () => {
      // Simular que la campaña tiene métricas completas
      await prisma.campaign.update({
        where: { id: testCampaignId },
        data: {
          estado: 'ENVIANDO',
          totalDestinatarios: 50,
          totalEnviados: 40,
          totalEntregados: 38,
          totalRespuestas: 12,
          totalLeadsGenerados: 5,
          totalClientesVinculados: 3,
          costoTotal: 2.00
        }
      });

      const res = await request(app.getHttpServer())
        .get('/dashboard/marketing-summary')
        .set('x-tenant-id', tenantId)
        .set('x-user-id', adminUserId)
        .set('x-role', 'admin')
        .expect(200);

      expect(res.body).toHaveProperty('campanasActivas', 1);
      expect(res.body).toHaveProperty('mensajesEnviados', 40);
      expect(res.body).toHaveProperty('respuestas', 12);
      expect(res.body).toHaveProperty('leadsGenerados', 5);
      expect(res.body).toHaveProperty('clientesReactivados', 3);
      expect(res.body.campanaConMejorRendimiento).toBeDefined();
      expect(res.body.campanaConMejorRendimiento.id).toBe(testCampaignId);
      expect(res.body.campanaConMejorRendimiento.tasaRespuesta).toBe(30); // 12/40 = 30%
    });
  });

  // ==========================================
  // BLOQUE 4.29: HERRAMIENTAS IA PARA ANÁLISIS DE CAMPAÑAS
  // ==========================================
  describe('4.29 IA para Análisis de Campañas', () => {
    it('getCampaignPerformance - Debe devolver métricas detalladas por campaña', async () => {
      const result: any = await aiToolsService.executeTool(
        'getCampaignPerformance',
        {},
        tenantId,
        'Admin',
        adminUserId
      );

      expect(result.totalCampanas).toBeGreaterThan(0);
      expect(Array.isArray(result.campanas)).toBe(true);
      expect(result.campanas[0].id).toBe(testCampaignId);
      expect(result.campanas[0].tasaRespuesta).toBe('30%');
    });

    it('getBestCampaign - Debe seleccionar y argumentar la mejor campaña', async () => {
      const result: any = await aiToolsService.executeTool(
        'getBestCampaign',
        { criterio: 'tasa_respuesta' },
        tenantId,
        'Admin',
        adminUserId
      );

      expect(result.mejorCampana).toBeDefined();
      expect(result.mejorCampana.id).toBe(testCampaignId);
      expect(result.motivoExito).toContain('30%');
      expect(result.recomendacion).toBeDefined();
    });

    it('getUnresponsiveCustomers - Debe listar clientes contactados sin respuesta', async () => {
      const result: any = await aiToolsService.executeTool(
        'getUnresponsiveCustomers',
        { limit: 10 },
        tenantId,
        'Admin',
        adminUserId
      );

      expect(result.totalSinRespuesta).toBeDefined();
      expect(Array.isArray(result.contactos)).toBe(true);
      expect(result.sugerenciaAccion).toBeDefined();
    });
  });
});
