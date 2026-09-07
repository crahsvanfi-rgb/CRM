import { vi, describe, it, expect, beforeAll, afterAll } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AiChatService } from '../src/modules/ai-chat/ai-chat.service.js';

describe('Zernio Webhook & Proxy (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  let tenantA_Id: string;
  let tenantB_Id: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
      .overrideProvider(AiChatService)
      .useValue({
        getChatResponse: vi.fn().mockResolvedValue({ reply: 'Respuesta automática de IA para WhatsApp' }),
      })
      .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);

    const tenantA = await prisma.tenant.create({
      data: { name: 'Tenant A Zernio E2E', domain: `a-zernio-${Date.now()}.com` },
    });
    const tenantB = await prisma.tenant.create({
      data: { name: 'Tenant B Zernio E2E', domain: `b-zernio-${Date.now()}.com` },
    });
    tenantA_Id = tenantA.id;
    tenantB_Id = tenantB.id;

    const roleAdmin = await prisma.role.create({
      data: { name: 'Admin', tenantId: tenantA_Id, permissions: {} },
    });

    await prisma.user.create({
      data: {
        id: '22222222-2222-2222-2222-222222222222',
        email: `admin-${Date.now()}@zernio.com`,
        tenantId: tenantA_Id,
        roleId: roleAdmin.id,
      },
    });
  });

  afterAll(async () => {
    try {
      await prisma.channelConnection.deleteMany({
        where: { tenantId: { in: [tenantA_Id, tenantB_Id] } },
      });
      await prisma.message.deleteMany({
        where: { tenantId: { in: [tenantA_Id, tenantB_Id] } },
      });
      await prisma.conversation.deleteMany({
        where: { tenantId: { in: [tenantA_Id, tenantB_Id] } },
      });
      await prisma.activity.deleteMany({
        where: { tenantId: { in: [tenantA_Id, tenantB_Id] } },
      });
      await prisma.leadTouchpoint.deleteMany({
        where: { tenantId: { in: [tenantA_Id, tenantB_Id] } },
      });
      await prisma.lead.deleteMany({
        where: { tenantId: { in: [tenantA_Id, tenantB_Id] } },
      });
      await prisma.user.deleteMany({
        where: { tenantId: { in: [tenantA_Id, tenantB_Id] } },
      });
      await prisma.role.deleteMany({
        where: { tenantId: { in: [tenantA_Id, tenantB_Id] } },
      });
      await prisma.tenant.deleteMany({
        where: { id: { in: [tenantA_Id, tenantB_Id] } },
      });
    } catch {}
    await app.close();
  });

  describe('GET /zernio/webhook (Verification)', () => {
    it('should return challenge on valid verify token', async () => {
      const res = await request(app.getHttpServer())
        .get('/zernio/webhook')
        .query({
          'hub.mode': 'subscribe',
          'hub.verify_token': 'crm_zernio_secure_2026',
          'hub.challenge': 'test_challenge_xyz',
        });

      expect(res.status).toBe(200);
      expect(res.text).toBe('test_challenge_xyz');
    });
  });

  describe('POST /zernio/webhook (Incoming message & Auto-scheduling)', () => {
    it('should create a new Lead when an unknown phone sends a message', async () => {
      const randomPhone = `+5917${Math.floor(1000000 + Math.random() * 9000000)}`;

      const res = await request(app.getHttpServer())
        .post('/zernio/webhook')
        .set('x-tenant-id', tenantA_Id)
        .send({
          telefono: randomPhone,
          mensaje: 'Hola, quisiera cotizar productos de importación',
          contactName: 'Carlos Prospecto',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const createdLead = await prisma.lead.findFirst({
        where: { tenantId: tenantA_Id, phone: randomPhone },
      });

      expect(createdLead).toBeDefined();
      expect(createdLead?.fuente).toBe('WHATSAPP_ZERNIO');
      expect(createdLead?.name).toBe('Carlos Prospecto');
    });

    it('should automatically schedule an Activity when schedule intent is detected', async () => {
      const randomPhone = `+5917${Math.floor(1000000 + Math.random() * 9000000)}`;

      const res = await request(app.getHttpServer())
        .post('/zernio/webhook')
        .set('x-tenant-id', tenantA_Id)
        .send({
          telefono: randomPhone,
          mensaje: 'Buenas tardes, me gustaría agendar una reunión para mañana para coordinar los pedidos',
          contactName: 'Mariana Importaciones',
        });

      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);
      expect(res.body.activityScheduled).toBe(true);

      const createdActivity = await prisma.activity.findFirst({
        where: { tenantId: tenantA_Id, tipo: 'REUNION' },
        orderBy: { createdAt: 'desc' },
      });

      expect(createdActivity).toBeDefined();
      expect(createdActivity?.titulo).toBe('Reunión solicitada por WhatsApp');
      expect(createdActivity?.descripcion).toContain('agendar una reunión');
    });

    it('should maintain multi-tenant isolation', async () => {
      const phoneTenantB = `+5917${Math.floor(1000000 + Math.random() * 9000000)}`;

      await request(app.getHttpServer())
        .post('/zernio/webhook')
        .set('x-tenant-id', tenantB_Id)
        .send({
          telefono: phoneTenantB,
          mensaje: 'Mensaje para Tenant B',
          contactName: 'Cliente B',
        });

      const leadInTenantA = await prisma.lead.findFirst({
        where: { tenantId: tenantA_Id, phone: phoneTenantB },
      });
      expect(leadInTenantA).toBeNull();

      const leadInTenantB = await prisma.lead.findFirst({
        where: { tenantId: tenantB_Id, phone: phoneTenantB },
      });
      expect(leadInTenantB).toBeDefined();
    });
  });

  describe('Configuration & Sending Endpoints', () => {
    it('should save configuration and test connection', async () => {
      const saveRes = await request(app.getHttpServer())
        .post('/zernio/config')
        .set('x-tenant-id', tenantA_Id)
        .send({
          apiKey: 'sk_test_zernio_valid_api_key_12345',
          habilitado: true,
          phone_number_id: 'ph_12345',
        });

      expect(saveRes.status).toBe(201);
      expect(saveRes.body.success).toBe(true);

      const testRes = await request(app.getHttpServer())
        .post('/zernio/test-connection')
        .set('x-tenant-id', tenantA_Id)
        .send({});

      expect(testRes.status).toBe(201);
      expect(testRes.body.status).toBe('CONECTADO');
    });

    it('should send an outgoing message and register it in Message table', async () => {
      const targetPhone = '+59178888888';
      const sendRes = await request(app.getHttpServer())
        .post('/zernio/send')
        .set('x-tenant-id', tenantA_Id)
        .send({
          telefono: targetPhone,
          mensaje: 'Estimado cliente, su pedido ha sido despachado.',
        });

      expect(sendRes.status).toBe(201);
      expect(sendRes.body.success).toBe(true);

      const messageInDb = await prisma.message.findFirst({
        where: { tenantId: tenantA_Id, content: 'Estimado cliente, su pedido ha sido despachado.' },
      });

      expect(messageInDb).toBeDefined();
      expect(messageInDb?.direction).toBe('SALIENTE');
    });

    it('should publish content across platforms', async () => {
      const pubRes = await request(app.getHttpServer())
        .post('/zernio/publicar')
        .set('x-tenant-id', tenantA_Id)
        .send({
          plataformas: ['whatsapp', 'facebook', 'instagram'],
          texto: 'Nueva importación de paneles disponible en stock!',
        });

      expect(pubRes.status).toBe(201);
      expect(pubRes.body.success).toBe(true);
      expect(pubRes.body.published).toBe(true);
    });
  });
});
