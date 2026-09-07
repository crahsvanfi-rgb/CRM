import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { describe, beforeAll, afterAll, it, expect } from 'vitest';
import crypto from 'crypto';

describe('Configuración, Consentimiento, Exclusión y Costos (e2e) - Bloque 4.21 a 4.24', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const tenantId = crypto.randomUUID();
  let adminUserId: string;
  let vendorUserId: string;
  let testCustomerId: string;
  let excludedCustomerId: string;
  let testCampaignId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    // 1. Crear Tenant
    await prisma.tenant.create({ data: { id: tenantId, name: 'Importadora Andina S.A.' } });

    // 2. Roles y Usuarios
    const roleAdmin = await prisma.role.create({ data: { tenantId, name: 'Admin', permissions: {} } });
    const roleVendor = await prisma.role.create({ data: { tenantId, name: 'Vendedor', permissions: {} } });

    const admin = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: `admin_${crypto.randomUUID()}@andina.com`,
        tenantId,
        roleId: roleAdmin.id
      }
    });
    adminUserId = admin.id;

    const vendor = await prisma.user.create({
      data: {
        id: crypto.randomUUID(),
        email: `vendor_${crypto.randomUUID()}@andina.com`,
        tenantId,
        roleId: roleVendor.id
      }
    });
    vendorUserId = vendor.id;

    // 3. Crear Clientes
    const customer1 = await prisma.customer.create({
      data: {
        tenantId,
        nitCi: `NIT-${crypto.randomUUID().slice(0, 8)}`,
        razonSocial: 'Cliente Normal S.R.L.',
        nombreComercial: 'Cliente Normal',
        telefono: '+59171111111',
        vendedorId: adminUserId,
        estado: 'ACTIVO'
      }
    });
    testCustomerId = customer1.id;

    const customer2 = await prisma.customer.create({
      data: {
        tenantId,
        nitCi: `NIT-${crypto.randomUUID().slice(0, 8)}`,
        razonSocial: 'Cliente Para Exclusión S.A.',
        nombreComercial: 'Cliente Excluido',
        telefono: '+59172222222',
        vendedorId: adminUserId,
        estado: 'ACTIVO'
      }
    });
    excludedCustomerId = customer2.id;
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe(`DELETE FROM "Tenant" WHERE id = '${tenantId}' CASCADE;`).catch(() => {});
    await app.close();
  });

  // ==========================================
  // BLOQUE 4.21: CONFIGURACIÓN DE CAMPAÑAS
  // ==========================================
  describe('4.21 Configuración General de Campañas (/campaign-config)', () => {
    it('GET /campaign-config - Debe retornar o inicializar configuración por defecto', async () => {
      const res = await request(app.getHttpServer())
        .get('/campaign-config')
        .set('x-tenant-id', tenantId)
        .set('x-user-id', adminUserId)
        .set('x-role', 'admin')
        .expect(200);

      expect(res.body).toHaveProperty('campanasActivas', true);
      expect(res.body).toHaveProperty('limiteMensajesPorDia');
      expect(res.body).toHaveProperty('horarioPermitidoInicio');
    });

    it('PUT /campaign-config - Vendedor no puede modificar configuración (RBAC)', async () => {
      await request(app.getHttpServer())
        .put('/campaign-config')
        .set('x-tenant-id', tenantId)
        .set('x-user-id', vendorUserId)
        .set('x-role', 'vendedor')
        .send({ campanasActivas: false })
        .expect(403);
    });

    it('PUT /campaign-config - Admin puede actualizar límites, horarios, tarifas y firma', async () => {
      const res = await request(app.getHttpServer())
        .put('/campaign-config')
        .set('x-tenant-id', tenantId)
        .set('x-user-id', adminUserId)
        .set('x-role', 'admin')
        .send({
          campanasActivas: true,
          aprobacionObligatoria: true,
          limiteMensajesPorDia: 2500,
          limiteMensajesPorHora: 150,
          horarioPermitidoInicio: '08:30',
          horarioPermitidoFin: '18:30',
          costoPorMensajeWhatsapp: 0.045,
          costoPorMensajeSms: 0.018,
          mensajePredeterminado: 'Estimado cliente, tenemos ofertas exclusivas.',
          firma: 'Atentamente, Gerencia Comercial Andina'
        })
        .expect(200);

      expect(res.body.limiteMensajesPorDia).toBe(2500);
      expect(res.body.horarioPermitidoInicio).toBe('08:30');
      expect(Number(res.body.costoPorMensajeWhatsapp)).toBe(0.045);
      expect(res.body.firma).toContain('Gerencia Comercial');
    });

    it('PATCH /campaign-config/toggle - Admin puede alternar el estado global de campañas', async () => {
      const resToggleOff = await request(app.getHttpServer())
        .patch('/campaign-config/toggle')
        .set('x-tenant-id', tenantId)
        .set('x-user-id', adminUserId)
        .set('x-role', 'admin')
        .expect(200);

      expect(resToggleOff.body.campanasActivas).toBe(false);

      // Reactivar para permitir pruebas posteriores
      const resToggleOn = await request(app.getHttpServer())
        .patch('/campaign-config/toggle')
        .set('x-tenant-id', tenantId)
        .set('x-user-id', adminUserId)
        .set('x-role', 'admin')
        .expect(200);

      expect(resToggleOn.body.campanasActivas).toBe(true);
    });
  });

  // ==========================================
  // BLOQUE 4.22: CONSENTIMIENTO Y CUMPLIMIENTO
  // ==========================================
  describe('4.22 Gestión de Consentimiento (/consent)', () => {
    it('POST /consent - Debe registrar consentimiento explícito para un contacto', async () => {
      const res = await request(app.getHttpServer())
        .post('/consent')
        .set('x-tenant-id', tenantId)
        .set('x-user-id', adminUserId)
        .set('x-role', 'admin')
        .send({
          tipoContacto: 'CUSTOMER',
          contactoId: testCustomerId,
          canal: 'WHATSAPP',
          estado: 'CONSENTIDO',
          origen: 'FORMULARIO_WEB',
          ipOrigen: '192.168.1.50',
          observaciones: 'Aceptó términos y condiciones al registrarse'
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.estado).toBe('CONSENTIDO');
      expect(res.body.origen).toBe('FORMULARIO_WEB');
    });

    it('GET /consent/status/:contactoId - Debe consultar estado de consentimiento del contacto', async () => {
      const res = await request(app.getHttpServer())
        .get(`/consent/status/${testCustomerId}`)
        .set('x-tenant-id', tenantId)
        .set('x-user-id', adminUserId)
        .set('x-role', 'admin')
        .expect(200);

      expect(res.body.contactoId).toBe(testCustomerId);
      expect(res.body.hasConsent).toBe(true);
      expect(res.body.estado).toBe('CONSENTIDO');
    });
  });

  // ==========================================
  // BLOQUE 4.23: LISTA DE EXCLUSIÓN (OPT-OUT)
  // ==========================================
  describe('4.23 Lista de Exclusión ("No Contactar" / OptOut)', () => {
    it('POST /opt-out - Debe agregar un contacto a la lista de exclusión y sincronizar Consent a NO_CONSENTIDO', async () => {
      const res = await request(app.getHttpServer())
        .post('/opt-out')
        .set('x-tenant-id', tenantId)
        .set('x-user-id', adminUserId)
        .set('x-role', 'admin')
        .send({
          tipoContacto: 'CUSTOMER',
          contactoId: excludedCustomerId,
          telefono: '+59172222222',
          motivo: 'Solicitó no recibir más promociones por WhatsApp'
        })
        .expect(201);

      expect(res.body).toHaveProperty('id');
      expect(res.body.contactoId).toBe(excludedCustomerId);
      expect(res.body.telefono).toBe('+59172222222');

      // Verificar que el consentimiento quedó sincronizado en NO_CONSENTIDO
      const consentRes = await request(app.getHttpServer())
        .get(`/consent/status/${excludedCustomerId}`)
        .set('x-tenant-id', tenantId)
        .set('x-user-id', adminUserId)
        .set('x-role', 'admin')
        .expect(200);

      expect(consentRes.body.hasConsent).toBe(false);
      expect(consentRes.body.estado).toBe('NO_CONSENTIDO');
    });

    it('GET /opt-out - Debe listar los contactos excluidos', async () => {
      const res = await request(app.getHttpServer())
        .get('/opt-out')
        .set('x-tenant-id', tenantId)
        .set('x-user-id', adminUserId)
        .set('x-role', 'admin')
        .expect(200);

      const items = res.body.data || res.body;
      expect(Array.isArray(items)).toBe(true);
      expect(items.some((item: any) => item.contactoId === excludedCustomerId)).toBe(true);
    });

    it('Campaña debe filtrar y bloquear al contacto excluido al agregar destinatarios', async () => {
      // 1. Crear campaña de prueba
      const campRes = await request(app.getHttpServer())
        .post('/campaigns')
        .set('x-tenant-id', tenantId)
        .set('x-user-id', adminUserId)
        .set('x-role', 'admin')
        .send({
          nombre: 'Campaña Prueba Exclusión',
          descripcion: 'Verificación de bloqueo OptOut',
          canal: 'WHATSAPP',
          objetivo: 'VENTAS',
          responsableId: adminUserId
        })
        .expect(201);

      testCampaignId = campRes.body.id;

      // 2. Intentar agregar ambos clientes (uno válido y el otro excluido)
      const addRes = await request(app.getHttpServer())
        .post(`/campaigns/${testCampaignId}/recipients/manual`)
        .set('x-tenant-id', tenantId)
        .set('x-user-id', adminUserId)
        .set('x-role', 'admin')
        .send({
          clienteIds: [testCustomerId, excludedCustomerId]
        })
        .expect(201);

      expect(addRes.body.agregados).toBe(1);
      expect(addRes.body.excluidosPorOptOut).toBe(1);

      // 3. Comprobar que en recipients solo existe el cliente no excluido
      const recsRes = await request(app.getHttpServer())
        .get(`/campaigns/${testCampaignId}/recipients`)
        .set('x-tenant-id', tenantId)
        .set('x-user-id', adminUserId)
        .set('x-role', 'admin')
        .expect(200);

      expect(recsRes.body.length).toBe(1);
      expect(recsRes.body[0].clienteId).toBe(testCustomerId);
    });

    it('DELETE /opt-out/:contactoId - Remover contacto de la lista de exclusión', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/opt-out/${excludedCustomerId}`)
        .set('x-tenant-id', tenantId)
        .set('x-user-id', adminUserId)
        .set('x-role', 'admin')
        .expect(200);

      expect(res.body.message).toContain('rehabilitado');
    });
  });

  // ==========================================
  // BLOQUE 4.24: REGISTRO Y CÁLCULO DE COSTOS
  // ==========================================
  describe('4.24 Control y Cálculo de Costos de Campaña (/campaigns/:id/costs)', () => {
    it('POST /campaigns/:id/costs/calculate - Debe calcular costo en base a tarifa configurada y total enviados', async () => {
      // Simular que la campaña tiene 10 mensajes enviados
      await prisma.campaign.update({
        where: { id: testCampaignId },
        data: { totalEnviados: 10 }
      });

      const res = await request(app.getHttpServer())
        .post(`/campaigns/${testCampaignId}/costs/calculate`)
        .set('x-tenant-id', tenantId)
        .set('x-user-id', adminUserId)
        .set('x-role', 'admin')
        .expect(201);

      // Con tarifa 0.045 de WhatsApp configurada en el tenant y 10 enviados: 10 * 0.045 = 0.4500 USD
      expect(res.body).toHaveProperty('costoTotal', 0.45);
      expect(res.body).toHaveProperty('cantidadMensajes', 10);
      expect(res.body).toHaveProperty('costoUnitario', 0.045);
      expect(res.body).toHaveProperty('moneda', 'USD');
    });

    it('GET /campaigns/:id/costs - Debe devolver el desglose y resumen de costos de la campaña', async () => {
      const res = await request(app.getHttpServer())
        .get(`/campaigns/${testCampaignId}/costs`)
        .set('x-tenant-id', tenantId)
        .set('x-user-id', adminUserId)
        .set('x-role', 'admin')
        .expect(200);

      expect(res.body).toHaveProperty('costoTotal', 0.45);
      expect(res.body).toHaveProperty('moneda', 'USD');
      expect(Array.isArray(res.body.desglose)).toBe(true);
      expect(res.body.desglose.length).toBeGreaterThan(0);
      expect(res.body.desglose[0].canal).toBe('WHATSAPP');
    });
  });
});
