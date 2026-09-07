import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { QuoteStatus } from '@prisma/client';
import { vi, describe, beforeAll, afterAll, it, expect } from 'vitest';

describe('QuotesController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const tenantId = '33333333-3333-3333-3333-333333333333';
  let userId: string;
  let customerId: string;
  let productId: string;
  let quoteId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    
    prisma = app.get<PrismaService>(PrismaService);
    
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.quoteItem.deleteMany();
    await prisma.quote.deleteMany();
    await prisma.product.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.user.deleteMany();
    await prisma.role.deleteMany();
    await prisma.tenant.deleteMany();
    
    const tenant = await prisma.tenant.create({ data: { id: tenantId, name: 'Tenant Quotes' } });
    await prisma.tenant.create({ data: { id: '44444444-4444-4444-4444-444444444444', name: 'Tenant B' } });
    const role = await prisma.role.create({ data: { tenantId, name: 'Admin', permissions: {} } });
    const user = await prisma.user.create({ data: { id: '00000000-0000-0000-0000-000000000000', email: 'q@q.com', tenantId, roleId: role.id } });
    userId = user.id;

    const customer = await prisma.customer.create({ data: { tenantId, nombreComercial: 'Cliente Q' } });
    customerId = customer.id;

    const prod = await prisma.product.create({ data: { tenantId, sku: 'Q-SKU', nombre: 'Prod Q', precioVenta: 100 } });
    productId = prod.id;
  });

  afterAll(async () => {
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.quoteItem.deleteMany();
    await prisma.quote.deleteMany();
    await prisma.product.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.user.deleteMany();
    await prisma.role.deleteMany();
    await prisma.tenant.deleteMany();
    await app.close();
  });

  it('/quotes (POST) - Crea cotización', async () => {
    const response = await request(app.getHttpServer())
      .post('/quotes')
      .set('x-tenant-id', tenantId)
      .send({
        clienteId: customerId,
        vendedorId: userId,
        items: [
          { productId, cantidad: 2, precioUnitario: 100, descuento: 20 }
        ]
      });

    if (response.status !== 201) {
      throw new Error(`POST /quotes failed with status ${response.status}: ${JSON.stringify(response.body)}`);
    }
    expect(response.status).toBe(201);
    expect(response.body.numero).toBe('COT-0001');
    expect(Number(response.body.subtotal)).toBe(180);
    expect(Number(response.body.total)).toBe(180);
    quoteId = response.body.id;
  });

  it('/quotes (GET) - Lista cotizaciones', async () => {
    const response = await request(app.getHttpServer())
      .get('/quotes')
      .set('x-tenant-id', tenantId);

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBe(1);
  });

  it('/quotes/:id/send (POST) - Cambia estado a ENVIADA', async () => {
    const response = await request(app.getHttpServer())
      .post(`/quotes/${quoteId}/send`)
      .set('x-tenant-id', tenantId);

    expect(response.status).toBe(200);
    expect(response.body.estado).toBe(QuoteStatus.ENVIADA);
  });

  it('/quotes/:id/convert-to-order (POST) - Convierte a pedido', async () => {
    const response = await request(app.getHttpServer())
      .post(`/quotes/${quoteId}/convert-to-order`)
      .set('x-tenant-id', tenantId);

    expect(response.status).toBe(201);
    expect(response.body.numero).toBe('PED-0001');

    // Verificar que la cotización pasó a ACEPTADA
    const qResp = await request(app.getHttpServer())
      .get(`/quotes/${quoteId}`)
      .set('x-tenant-id', tenantId);
    
    expect(qResp.body.estado).toBe(QuoteStatus.ACEPTADA);
  });

  it('/quotes/:id (PATCH) - Falla si está aceptada', async () => {
    const response = await request(app.getHttpServer())
      .patch(`/quotes/${quoteId}`)
      .set('x-tenant-id', tenantId)
      .send({ observaciones: 'Test' });

    expect(response.status).toBe(400); // Bad Request
  });

  it('Aislamiento Multitenant: Tenant B no debe ver la cotización de Tenant A', async () => {
    const response = await request(app.getHttpServer())
      .get(`/quotes/${quoteId}`)
      .set('x-tenant-id', '44444444-4444-4444-4444-444444444444');

    expect(response.status).toBe(404);
  });
});
