import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { OrderStatus, MovementType } from '@prisma/client';
import { vi, describe, beforeAll, afterAll, it, expect } from 'vitest';

describe('OrdersController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  
  const tenantId = '55555555-5555-5555-5555-555555555555';
  let userId: string;
  let orderId: string;
  let customerId: string;
  let productId: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    
    prisma = app.get(PrismaService);
    
    // Limpiar BD
    await prisma.inventoryMovement.deleteMany();
    await prisma.productStock.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.user.deleteMany();
    await prisma.role.deleteMany();
    await prisma.tenant.deleteMany();

    // Crear Tenant
    await prisma.tenant.create({ data: { id: tenantId, name: 'Tenant Orders' } });
    await prisma.tenant.create({ data: { id: '66666666-6666-4666-8666-666666666666', name: 'Tenant B' } });
    
    // Crear User
    const role = await prisma.role.create({ data: { tenantId, name: 'Admin', permissions: {} } });
    const user = await prisma.user.create({ data: { id: '77777777-7777-4777-8777-777777777777', email: 'o@o.com', tenantId, roleId: role.id } });
    userId = user.id;

    // Crear Customer y Product
    const customer = await prisma.customer.create({
      data: { tenantId, nombreComercial: 'Cliente Pedido' }
    });
    customerId = customer.id;
    
    const product = await prisma.product.create({
      data: { tenantId, sku: 'SKU-ORD', nombre: 'Prod Order', precioVenta: 100 }
    });
    productId = product.id;
    
    // Agregar stock inicial vía backend directamente
    await prisma.productStock.create({
      data: { tenantId, productId, stockFisico: 50, stockReservado: 0, stockTransito: 0 }
    });
  });

  afterAll(async () => {
    await prisma.inventoryMovement.deleteMany();
    await prisma.productStock.deleteMany();
    await prisma.orderItem.deleteMany();
    await prisma.order.deleteMany();
    await prisma.product.deleteMany();
    await prisma.customer.deleteMany();
    await prisma.user.deleteMany();
    await prisma.role.deleteMany();
    await prisma.tenant.deleteMany();
    await app.close();
  });

  it('/orders (POST) - Crea pedido manual', async () => {
    const response = await request(app.getHttpServer())
      .post('/orders')
      .set('x-tenant-id', tenantId)
      .send({
        clienteId: customerId,
        vendedorId: userId,
        items: [
          { productId, cantidad: 5, precioUnitario: 100, descuento: 0 }
        ]
      });

    if (response.status !== 201) {
      throw new Error('Create failed: ' + JSON.stringify(response.body));
    }

    expect(response.status).toBe(201);
    expect(response.body.numero).toBe('PED-0001');
    expect(response.body.estado).toBe(OrderStatus.PENDIENTE);
    expect(response.body.total).toBe('500'); // Decimal arrives as string
    orderId = response.body.id;
  });

  it('/orders (GET) - Lista pedidos', async () => {
    const response = await request(app.getHttpServer())
      .get('/orders')
      .set('x-tenant-id', tenantId);

    expect(response.status).toBe(200);
    expect(response.body.data.length).toBe(1);
    expect(response.body.data[0].id).toBe(orderId);
  });

  it('/orders/:id/confirm (POST) - Confirma pedido y reserva stock', async () => {
    const response = await request(app.getHttpServer())
      .post(`/orders/${orderId}/confirm`)
      .set('x-tenant-id', tenantId)
      .set('x-user-id', userId);

    expect(response.status).toBe(201);
    expect(response.body.estado).toBe(OrderStatus.CONFIRMADO);

    // Verify stock is reserved
    const stock = await prisma.productStock.findUnique({ where: { tenantId_productId: { tenantId, productId } } });
    expect(stock?.stockFisico).toBe(50);
    expect(stock?.stockReservado).toBe(5);
  });

  it('/orders/:id/deliver (POST) - Entrega pedido y baja stock', async () => {
    const response = await request(app.getHttpServer())
      .post(`/orders/${orderId}/deliver`)
      .set('x-tenant-id', tenantId)
      .set('x-user-id', userId);

    expect(response.status).toBe(201);
    expect(response.body.estado).toBe(OrderStatus.ENTREGADO);

    // Verify stock is deducted and reservation released
    const stock = await prisma.productStock.findUnique({ where: { tenantId_productId: { tenantId, productId } } });
    expect(stock?.stockFisico).toBe(45); // 50 - 5
    expect(stock?.stockReservado).toBe(0); // released
  });

  it('Aislamiento Multitenant: Tenant B no debe ver los pedidos', async () => {
    const response = await request(app.getHttpServer())
      .get(`/orders/${orderId}`)
      .set('x-tenant-id', '66666666-6666-4666-8666-666666666666');

    expect(response.status).toBe(404);
  });
});
