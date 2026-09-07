import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AuthService } from '../src/core/auth/auth.service.js';
import { ExternalChannel } from '@prisma/client';
import { AiChatService } from '../src/modules/ai-chat/ai-chat.service.js';

describe('Zenior Integration (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;

  let tenantA_Id: string;
  let tenantB_Id: string;
  let adminAToken: string;
  let vendorAToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    })
    .overrideProvider(AiChatService)
    .useValue({
      getChatResponse: jest.fn().mockResolvedValue({ reply: 'Respuesta E2E IA' }),
    })
    .compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    authService = app.get(AuthService);

    const tenantA = await prisma.tenant.create({ data: { name: 'Tenant A Zenior', domain: 'a-zenior.com' } });
    const tenantB = await prisma.tenant.create({ data: { name: 'Tenant B Zenior', domain: 'b-zenior.com' } });
    tenantA_Id = tenantA.id;
    tenantB_Id = tenantB.id;

    const roleAdmin = await prisma.role.create({ data: { name: 'Admin', isSystemRole: true, tenantId: tenantA_Id } });
    const roleVendor = await prisma.role.create({ data: { name: 'Vendedor', isSystemRole: true, tenantId: tenantA_Id } });
    
    const adminA = await prisma.user.create({ data: { id: 'uuid-admin-a-zen', email: 'admin-zen@a.com', tenantId: tenantA_Id, roleId: roleAdmin.id } });
    const vendorA = await prisma.user.create({ data: { id: 'uuid-vendor-a-zen', email: 'vendor-zen@a.com', tenantId: tenantA_Id, roleId: roleVendor.id } });

    adminAToken = authService.generateToken(adminA);
    vendorAToken = authService.generateToken(vendorA);
  });

  afterAll(async () => {
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantA_Id, tenantB_Id] } } });
    await app.close();
  });

  describe('Configuration', () => {
    it('Admin should be able to configure Zenior', async () => {
      const res = await request(app.getHttpServer())
        .put('/external-channels/zenior')
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({
          habilitado: true,
          configJson: { verify_token: 'secret', token: 'abcd', phone_number_id: '123' }
        });
      
      expect(res.status).toBe(200);
      expect(res.body.success).toBe(true);

      const config = await prisma.externalChannelConfig.findFirst({ where: { tenantId: tenantA_Id } });
      expect(config).toBeDefined();
      expect(config?.habilitado).toBe(true);
      expect((config?.configJson as any).verify_token).toBe('secret');
      expect((config?.configJson as any).token).not.toBe('abcd'); // Must be encrypted
    });

    it('Vendedor should receive 403 when configuring', async () => {
      const res = await request(app.getHttpServer())
        .put('/external-channels/zenior')
        .set('Authorization', `Bearer ${vendorAToken}`)
        .send({ habilitado: false });
      
      expect(res.status).toBe(403);
    });
  });

  describe('Webhook', () => {
    it('should verify webhook challenge (GET)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/webhooks/zenior?tenant_id=${tenantA_Id}&hub.mode=subscribe&hub.verify_token=secret&hub.challenge=123456789`);
      
      expect(res.status).toBe(200);
      expect(res.text).toBe('123456789');
    });

    it('should reject invalid verify_token (GET)', async () => {
      const res = await request(app.getHttpServer())
        .get(`/webhooks/zenior?tenant_id=${tenantA_Id}&hub.mode=subscribe&hub.verify_token=wrong&hub.challenge=123456789`);
      
      expect(res.status).toBe(403);
    });

    it('should process incoming message (POST) and respond 200 immediately', async () => {
      const payload = {
        object: 'page',
        entry: [{
          messaging: [{
            sender: { id: 'fb-user-1' },
            message: { text: 'e2e test message', mid: 'mid-e2e' }
          }]
        }]
      };

      const res = await request(app.getHttpServer())
        .post(`/webhooks/zenior?tenant_id=${tenantA_Id}`)
        .send(payload);
      
      expect(res.status).toBe(200);
      expect(res.text).toBe('EVENT_RECEIVED');

      // Allow background process to complete
      await new Promise(r => setTimeout(r, 1000));

      const conversations = await prisma.externalConversation.findMany({ where: { tenantId: tenantA_Id } });
      expect(conversations.length).toBe(1);
      expect(conversations[0].contactoId).toBe('fb-user-1');

      const messages = await prisma.externalMessage.findMany({ where: { conversationId: conversations[0].id } });
      expect(messages.length).toBe(2); // 1 entrante, 1 saliente
      
      const outgoing = messages.find(m => m.direccion === 'SALIENTE');
      expect(outgoing?.contenido).toBe('Respuesta E2E IA');
    });
  });
});
