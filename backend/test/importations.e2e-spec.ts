import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';

describe('ImportationsModule (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  
  const tenant1Id = '11111111-1111-1111-1111-111111111111';
  const tenant2Id = '22222222-2222-2222-2222-222222222222';
  const user1Id = '00000000-0000-0000-0000-000000000001';
  
  let supplierId: string;
  let productId: string;
  let importationId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
    
    prisma = app.get<PrismaService>(PrismaService);
    
    // Seed basic data
    await prisma.$executeRawUnsafe(`
      INSERT INTO "Tenant" (id, name, domain, "updatedAt") 
      VALUES ('${tenant1Id}', 'Tenant 1', 't1.com', NOW()) ON CONFLICT DO NOTHING;
    `);
    await prisma.$executeRawUnsafe(`
      INSERT INTO "Tenant" (id, name, domain, "updatedAt") 
      VALUES ('${tenant2Id}', 'Tenant 2', 't2.com', NOW()) ON CONFLICT DO NOTHING;
    `);
    await prisma.$executeRawUnsafe(`
      INSERT INTO "Role" (id, name, "tenantId", permissions)
      VALUES ('${user1Id}', 'Admin', '${tenant1Id}', '{}') ON CONFLICT DO NOTHING;
    `);
    await prisma.$executeRawUnsafe(`
      INSERT INTO "User" (id, email, name, "roleId", "tenantId", "updatedAt")
      VALUES ('${user1Id}', 'test@t1.com', 'Test User', '${user1Id}', '${tenant1Id}', NOW()) ON CONFLICT DO NOTHING;
    `);

    // Create supplier
    const supplierRes = await request(app.getHttpServer())
      .post('/suppliers')
      .set('x-tenant-id', tenant1Id)
      .send({ nombre: 'Supplier Test', pais: 'China' });
    supplierId = supplierRes.body.id;

    // Create product
    const prodRes = await request(app.getHttpServer())
      .post('/products')
      .set('x-tenant-id', tenant1Id)
      .send({ sku: 'TEST-IMP', nombre: 'Prod Imp', precioVenta: 100 });
    productId = prodRes.body.id;
  });

  afterAll(async () => {
    await prisma.$executeRawUnsafe('DELETE FROM "Importation"');
    await prisma.$executeRawUnsafe('DELETE FROM "Supplier"');
    await prisma.$executeRawUnsafe(`DELETE FROM "Product" WHERE sku = 'TEST-IMP'`);
    await app.close();
  });

  it('/importations (POST) - Create Importation', async () => {
    const res = await request(app.getHttpServer())
      .post('/importations')
      .set('x-tenant-id', tenant1Id)
      .send({
        proveedorId: supplierId,
        items: [
          { productId, cantidad: 100, costoUnitario: 5.5 }
        ]
      });

    expect(res.status).toBe(201);
    expect(res.body.codigo).toBeDefined();
    expect(res.body.estado).toBe('PLANIFICADA');
    importationId = res.body.id;
  });

  it('/importations (GET) - List Isolation', async () => {
    const resT1 = await request(app.getHttpServer())
      .get('/importations')
      .set('x-tenant-id', tenant1Id);
    
    const resT2 = await request(app.getHttpServer())
      .get('/importations')
      .set('x-tenant-id', tenant2Id);

    expect(resT1.body.data.length).toBe(1);
    expect(resT2.body.data.length).toBe(0);
  });

  it('/importations/:id/transition (POST) - Advance State', async () => {
    const res = await request(app.getHttpServer())
      .post(`/importations/${importationId}/transition`)
      .set('x-tenant-id', tenant1Id)
      .send({ newState: 'ADUANA' });

    expect(res.status).toBe(201);
    expect(res.body.estado).toBe('ADUANA');
  });

  it('/importations/:id/receive (POST) - Receive Importation & update stock', async () => {
    const res = await request(app.getHttpServer())
      .post(`/importations/${importationId}/receive`)
      .set('x-tenant-id', tenant1Id)
      .set('x-user-id', user1Id);

    expect(res.status).toBe(201);
    expect(res.body.estado).toBe('RECIBIDA');

    // Verificamos el stock en inventario
    const stockRes = await request(app.getHttpServer())
      .get(`/inventory/stock/${productId}`)
      .set('x-tenant-id', tenant1Id);
    
    expect(stockRes.body.fisico).toBe(100);
  });
});
