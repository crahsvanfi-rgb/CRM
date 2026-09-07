import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { vi, describe, beforeAll, afterAll, it, expect } from 'vitest';
import crypto from 'crypto';

describe('AI Config Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  
  const tenantA = crypto.randomUUID();
  const tenantB = crypto.randomUUID();
  let userIdA: string;
  let userIdB: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    
    prisma = app.get(PrismaService);
    
    // Limpieza agresiva de BD
    const deleteOps = [
      prisma.inventoryMovement.deleteMany(),
      prisma.productStock.deleteMany(),
      prisma.orderItem.deleteMany(),
      prisma.order.deleteMany(),
      prisma.quoteItem.deleteMany(),
      prisma.quote.deleteMany(),
      prisma.importationItem.deleteMany(),
      prisma.importation.deleteMany(),
      prisma.auditLog.deleteMany(),
      prisma.activity.deleteMany(),
      prisma.leadActivity.deleteMany(),
      prisma.product.deleteMany(),
      prisma.supplier.deleteMany(),
      prisma.customer.deleteMany(),
      prisma.lead.deleteMany(),
      prisma.user.deleteMany(),
      prisma.role.deleteMany(),
      prisma.aIConfiguration.deleteMany(),
      prisma.tenant.deleteMany()
    ];
    await prisma.$transaction(deleteOps);

    // Crear tenants
    await prisma.tenant.create({ data: { id: tenantA, name: 'Tenant A AI' } });
    await prisma.tenant.create({ data: { id: tenantB, name: 'Tenant B AI' } });
    
    const roleA = await prisma.role.create({ data: { tenantId: tenantA, name: 'Admin', permissions: {} } });
    const userA = await prisma.user.create({ data: { id: crypto.randomUUID(), email: 'adminai@a.com', tenantId: tenantA, roleId: roleA.id } });
    userIdA = userA.id;

    const roleB = await prisma.role.create({ data: { tenantId: tenantB, name: 'Admin', permissions: {} } });
    const userB = await prisma.user.create({ data: { id: crypto.randomUUID(), email: 'adminai@b.com', tenantId: tenantB, roleId: roleB.id } });
    userIdB = userB.id;
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. GET /ai-config (Por defecto debe ser SIN_CONFIGURAR)', async () => {
    const res = await request(app.getHttpServer())
      .get('/ai-config')
      .set('x-tenant-id', tenantA)
      .set('x-user-id', userIdA)
      .expect(200);

    expect(res.body.estado).toBe('SIN_CONFIGURAR');
    expect(res.body.habilitada).toBe(false);
    expect(res.body.apiKey).toBeNull();
  });

  it('2. PUT /ai-config (Falla si se habilita sin API Key)', async () => {
    const res = await request(app.getHttpServer())
      .put('/ai-config')
      .set('x-tenant-id', tenantA)
      .set('x-user-id', userIdA)
      .send({
        habilitada: true
      })
      .expect(400);

    expect(res.body.message).toBe('Se requiere una API Key para habilitar la IA.');
  });

  it('3. PUT /ai-config (Guarda exitosamente la config y encripta)', async () => {
    const res = await request(app.getHttpServer())
      .put('/ai-config')
      .set('x-tenant-id', tenantA)
      .set('x-user-id', userIdA)
      .send({
        habilitada: true,
        apiKey: 'sk-or-v1-mysecretkey123',
        modelo: 'openai/gpt-4o',
        temperatura: 0.7
      })
      .expect(200);

    expect(res.body.habilitada).toBe(true);
    
    // En la DB la llave debe estar encriptada
    const dbConfig = await prisma.aIConfiguration.findUnique({ where: { tenantId: tenantA } });
    expect(dbConfig?.apiKey).toBeDefined();
    expect(dbConfig?.apiKey).not.toContain('sk-or-v1-mysecretkey123'); // Debe estar cifrado
    expect(dbConfig?.apiKey).toContain(':'); // Formato de iv:authTag:encrypted
  });

  it('4. GET /ai-config (Devuelve la llave enmascarada)', async () => {
    const res = await request(app.getHttpServer())
      .get('/ai-config')
      .set('x-tenant-id', tenantA)
      .set('x-user-id', userIdA)
      .expect(200);

    expect(res.body.apiKey).toBe('****y123'); // sk-or-v1-mysecretkey123 termina en y123
    expect(res.body.modelo).toBe('openai/gpt-4o');
  });

  it('5. GET /ai-config (Aislamiento Multitenant)', async () => {
    // Tenant B no debería ver la config del A, debería obtener SIN_CONFIGURAR por defecto
    const res = await request(app.getHttpServer())
      .get('/ai-config')
      .set('x-tenant-id', tenantB)
      .set('x-user-id', userIdB)
      .expect(200);

    expect(res.body.estado).toBe('SIN_CONFIGURAR');
    expect(res.body.apiKey).toBeNull();
  });

  it('6. POST /ai-config/test (Falla por key inválida mockeada)', async () => {
    // Mock the global fetch to return an error for this test
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      status: 401,
      json: async () => ({ error: { message: 'Invalid API Key' } })
    }) as any;

    const res = await request(app.getHttpServer())
      .post('/ai-config/test')
      .set('x-tenant-id', tenantA)
      .set('x-user-id', userIdA)
      .expect(400);

    // Al fallar, el estado debería pasar a ERROR
    const dbConfig = await prisma.aIConfiguration.findUnique({ where: { tenantId: tenantA } });
    expect(dbConfig?.estado).toBe('ERROR');

    // Restore fetch
    global.fetch = originalFetch;
  });

  it('7. DELETE /ai-config (Restablece valores)', async () => {
    const res = await request(app.getHttpServer())
      .delete('/ai-config')
      .set('x-tenant-id', tenantA)
      .set('x-user-id', userIdA)
      .expect(200);

    const dbConfig = await prisma.aIConfiguration.findUnique({ where: { tenantId: tenantA } });
    expect(dbConfig?.estado).toBe('SIN_CONFIGURAR');
    expect(dbConfig?.apiKey).toBeNull();
    expect(dbConfig?.habilitada).toBe(false);
  });
});
