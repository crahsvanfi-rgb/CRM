import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { MovementType } from '@prisma/client';
import { vi, describe, beforeAll, afterAll, it, expect } from 'vitest';

describe('InventoryController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;

  const tenantIdA = '11111111-1111-1111-1111-111111111111';
  const tenantIdB = '22222222-2222-2222-2222-222222222222';
  
  let productIdA: string;
  let productIdB: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    
    prisma = app.get<PrismaService>(PrismaService);
    
    // Clean up
    await prisma.inventoryMovement.deleteMany();
    await prisma.productStock.deleteMany();
    await prisma.product.deleteMany();
    await prisma.category.deleteMany();
    await prisma.tenant.deleteMany();
    
    // Create tenants
    await prisma.tenant.createMany({
      data: [
        { id: tenantIdA, name: 'Tenant A' },
        { id: tenantIdB, name: 'Tenant B' }
      ]
    });
    
    // Create users
    const roleA = await prisma.role.create({ data: { tenantId: tenantIdA, name: 'Admin A', permissions: {} } });
    const roleB = await prisma.role.create({ data: { tenantId: tenantIdB, name: 'Admin B', permissions: {} } });
    
    await prisma.user.create({ data: { id: '00000000-0000-0000-0000-000000000000', email: 'user@a.com', tenantId: tenantIdA, roleId: roleA.id } });

    // Create products
    const prodA = await prisma.product.create({
      data: { tenantId: tenantIdA, nombre: 'Prod A', sku: 'SKU-A', precioVenta: 100 }
    });
    productIdA = prodA.id;
    
    const prodB = await prisma.product.create({
      data: { tenantId: tenantIdB, nombre: 'Prod B', sku: 'SKU-B', precioVenta: 100 }
    });
    productIdB = prodB.id;
  });

  afterAll(async () => {
    await prisma.inventoryMovement.deleteMany();
    await prisma.productStock.deleteMany();
    await prisma.product.deleteMany();
    await prisma.tenant.deleteMany();
    await app.close();
  });

  it('/inventory/movements (POST) - Debe crear un movimiento de entrada', async () => {
    const response = await request(app.getHttpServer())
      .post('/inventory/movements')
      .set('x-tenant-id', tenantIdA)
      .send({
        productId: productIdA,
        tipo: MovementType.ENTRADA_IMPORTACION,
        cantidad: 50,
      });

    expect(response.status).toBe(201);
    expect(response.body.stockPosterior).toBe(50);
  });

  it('/inventory/stock/:productId (GET) - Debe verificar que el stock Físico sea 50', async () => {
    const response = await request(app.getHttpServer())
      .get(`/inventory/stock/${productIdA}`)
      .set('x-tenant-id', tenantIdA);

    expect(response.status).toBe(200);
    expect(response.body.fisico).toBe(50);
    expect(response.body.disponible).toBe(50);
  });

  it('/inventory/reserve (POST) - Debe reservar 10 unidades', async () => {
    const response = await request(app.getHttpServer())
      .post('/inventory/reserve')
      .set('x-tenant-id', tenantIdA)
      .send({
        productId: productIdA,
        cantidad: 10,
        documentoRef: 'PEDIDO-001'
      });

    expect(response.status).toBe(201);
    
    // Verificamos que el stock disponible bajó
    const stock = await request(app.getHttpServer())
      .get(`/inventory/stock/${productIdA}`)
      .set('x-tenant-id', tenantIdA);
      
    expect(stock.body.fisico).toBe(50);
    expect(stock.body.reservado).toBe(10);
    expect(stock.body.disponible).toBe(40);
  });

  it('/inventory/reserve (POST) - Debe fallar si reserva más de lo disponible', async () => {
    const response = await request(app.getHttpServer())
      .post('/inventory/reserve')
      .set('x-tenant-id', tenantIdA)
      .send({
        productId: productIdA,
        cantidad: 100,
        documentoRef: 'PEDIDO-002'
      });

    expect(response.status).toBe(400); // BadRequestException
  });

  it('/inventory/release (POST) - Debe liberar 5 unidades de la reserva', async () => {
    const response = await request(app.getHttpServer())
      .post('/inventory/release')
      .set('x-tenant-id', tenantIdA)
      .send({
        documentoRef: 'PEDIDO-001',
        cantidad: 5
      });

    expect(response.status).toBe(200);

    const stock = await request(app.getHttpServer())
      .get(`/inventory/stock/${productIdA}`)
      .set('x-tenant-id', tenantIdA);
      
    expect(stock.body.reservado).toBe(5);
    expect(stock.body.disponible).toBe(45);
  });

  it('/inventory/movements (GET) - Aislamiento multitenant', async () => {
    // Tenant B no debe ver los movimientos de Tenant A
    const response = await request(app.getHttpServer())
      .get('/inventory/movements')
      .set('x-tenant-id', tenantIdB);

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBe(0);
    expect(response.body.meta.total).toBe(0);
  });
});
