import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { vi, describe, beforeAll, afterAll, it, expect } from 'vitest';
import crypto from 'crypto';

describe('Integración Completa (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  
  const tenantA = crypto.randomUUID();
  const tenantB = crypto.randomUUID();
  let userIdA: string;
  let userIdB: string;
  let supplierId: string;
  
  let leadId: string;
  let customerId: string;
  let productId: string;
  let quoteId: string;
  let orderId: string;
  let importationId: string;

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
      prisma.tenant.deleteMany()
    ];
    await prisma.$transaction(deleteOps);

    // Seed base
    await prisma.tenant.create({ data: { id: tenantA, name: 'Tenant A' } });
    await prisma.tenant.create({ data: { id: tenantB, name: 'Tenant B' } });
    
    const roleA = await prisma.role.create({ data: { tenantId: tenantA, name: 'Admin', permissions: {} } });
    const userA = await prisma.user.create({ data: { id: crypto.randomUUID(), email: 'admin@a.com', tenantId: tenantA, roleId: roleA.id } });
    userIdA = userA.id;

    const roleB = await prisma.role.create({ data: { tenantId: tenantB, name: 'Admin', permissions: {} } });
    const userB = await prisma.user.create({ data: { id: crypto.randomUUID(), email: 'admin@b.com', tenantId: tenantB, roleId: roleB.id } });
    userIdB = userB.id;

    // Crear proveedor base para importaciones
    const supplier = await prisma.supplier.create({ data: { tenantId: tenantA, nombre: 'China Supplier' }});
    supplierId = supplier.id;

    // Crear un producto base para la prueba
    const prod = await prisma.product.create({
      data: { tenantId: tenantA, sku: 'INT-01', nombre: 'Producto de Integracion', precioVenta: 150, stockMinimo: 10 }
    });
    productId = prod.id;
    await prisma.productStock.create({
      data: { tenantId: tenantA, productId, stockFisico: 100, stockReservado: 0, stockTransito: 0 }
    });
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Flujos Comerciales', () => {
    it('1. Lead → Cliente', async () => {
      // Create lead
      const leadRes = await request(app.getHttpServer())
        .post('/leads')
        .set('x-tenant-id', tenantA)
        .set('x-user-id', userIdA)
        .send({ name: 'Juan', companyName: 'Juan Corp', email: 'j@j.com', vendedorId: userIdA });
      if (leadRes.status !== 201) console.log('LEAD ERROR:', leadRes.body);
      expect(leadRes.status).toBe(201);
      leadId = leadRes.body.id;

      // Convert to customer
      const convRes = await request(app.getHttpServer())
        .post(`/leads/${leadId}/convert`)
        .set('x-tenant-id', tenantA)
        .set('x-user-id', userIdA);
      
      expect(convRes.status).toBe(200);
      customerId = convRes.body.customer.id;
      expect(convRes.body.customer.leadId).toBe(leadId); // Relation maintained
    });

    it('2. Cliente → Cotización', async () => {
      const qRes = await request(app.getHttpServer())
        .post('/quotes')
        .set('x-tenant-id', tenantA)
        .set('x-user-id', userIdA)
        .send({
          clienteId: customerId,
          vendedorId: userIdA,
          moneda: 'USD',
          items: [{ productId, cantidad: 10, precioUnitario: 150, descuento: 0 }]
        });
      
      if (qRes.status !== 201) console.log('QUOTE ERROR:', qRes.body);
      expect(qRes.status).toBe(201);
      quoteId = qRes.body.id;
      expect(qRes.body.estado).toBe('BORRADOR');
      expect(Number(qRes.body.total)).toBe(1500);
    });

    it('3. Cotización → Pedido', async () => {
      const oRes = await request(app.getHttpServer())
        .post(`/quotes/${quoteId}/convert-to-order`)
        .set('x-tenant-id', tenantA)
        .set('x-user-id', userIdA);
      
      if (oRes.status !== 201) console.log('ORDER ERROR:', oRes.body);
      expect(oRes.status).toBe(201);
      orderId = oRes.body.id;
      expect(oRes.body.estado).toBe('PENDIENTE');
      expect(oRes.body.quoteId).toBe(quoteId);
      
      // Verify items copied
      const orderDb = await prisma.order.findUnique({ where: { id: orderId }, include: { items: true } });
      expect(orderDb?.items.length).toBe(1);
      expect(orderDb?.items[0].cantidad).toBe(10);
    });
  });

  describe('Flujos de Inventario y Despacho', () => {
    it('4. Pedido → Reserva', async () => {
        const confirmRes = await request(app.getHttpServer())
        .post(`/orders/${orderId}/confirm`)
        .set('x-tenant-id', tenantA)
        .set('x-user-id', userIdA);
        if (confirmRes.status !== 201) console.log('CONFIRM ERROR:', confirmRes.body);
        expect(confirmRes.status).toBe(201);
      
      const stock = await prisma.productStock.findUnique({ where: { tenantId_productId: { tenantId: tenantA, productId } } });
      expect(stock?.stockFisico).toBe(100);
      expect(stock?.stockReservado).toBe(10); // Reservó 10
      
      const mov = await prisma.inventoryMovement.findFirst({ where: { tenantId: tenantA, productId, tipo: 'RESERVA' } });
      expect(mov).toBeDefined();
    });

    it('5. Pedido → Salida', async () => {
      await request(app.getHttpServer())
        .post(`/orders/${orderId}/deliver`)
        .set('x-tenant-id', tenantA)
        .set('x-user-id', userIdA)
        .expect(201);
      
      const stock = await prisma.productStock.findUnique({ where: { tenantId_productId: { tenantId: tenantA, productId } } });
      expect(stock?.stockFisico).toBe(90); // 100 - 10
      expect(stock?.stockReservado).toBe(0); // Liberado
      
      const mov = await prisma.inventoryMovement.findFirst({ where: { tenantId: tenantA, productId, tipo: 'SALIDA_VENTA' } });
      expect(mov).toBeDefined();
    });
  });

  describe('Flujos Logísticos (Importaciones)', () => {
    it('6. Importación → Producto', async () => {
      const impRes = await request(app.getHttpServer())
        .post('/importations')
        .set('x-tenant-id', tenantA)
        .set('x-user-id', userIdA)
        .send({
          codigo: 'IMP-001',
          proveedorId: supplierId,
          items: [{ productId, cantidad: 500, costoUnitario: 50 }]
        });
      
      expect(impRes.status).toBe(201);
      importationId = impRes.body.id;
      expect(impRes.body.estado).toBe('PLANIFICADA');
    });

    it('7. Importación → Stock en tránsito', async () => {
      const stateRes = await request(app.getHttpServer())
        .post(`/importations/${importationId}/transition`)
        .set('x-tenant-id', tenantA)
        .set('x-user-id', userIdA)
        .send({ newState: 'EN_TRANSITO' });
        
      expect(stateRes.status).toBe(201);
      
      // Stock en tránsito debe aumentar
      const stock = await prisma.productStock.findUnique({ where: { tenantId_productId: { tenantId: tenantA, productId } } });
      expect(stock?.stockTransito).toBe(500);
    });

    it('8. Importación recibida → Entrada', async () => {
      await request(app.getHttpServer())
        .post(`/importations/${importationId}/transition`)
        .set('x-tenant-id', tenantA)
        .set('x-user-id', userIdA)
        .send({ newState: 'ADUANA' })
        .expect(201);
        
      const stateRes = await request(app.getHttpServer())
        .post(`/importations/${importationId}/receive`)
        .set('x-tenant-id', tenantA)
        .set('x-user-id', userIdA)
        .send({});
        
      expect(stateRes.status).toBe(201);

      const stock = await prisma.productStock.findUnique({ where: { tenantId_productId: { tenantId: tenantA, productId } } });
      // El inventario pasa de transito a fisico
      expect(stock?.stockTransito).toBe(0);
      expect(stock?.stockFisico).toBe(590);
      expect(stock?.stockTransito).toBe(0); // Baja el tránsito

      const mov = await prisma.inventoryMovement.findFirst({ where: { tenantId: tenantA, productId, tipo: 'ENTRADA_IMPORTACION' } });
      expect(mov).toBeDefined();
    });
  });

  describe('Seguimientos (Agenda)', () => {
    it('9. Cliente → Actividades', async () => {
      const actRes = await request(app.getHttpServer())
        .post('/activities')
        .set('x-tenant-id', tenantA)
        .set('x-user-id', userIdA)
        .send({
          tipo: 'LLAMADA',
          titulo: 'Llamar a cliente',
          fecha: new Date().toISOString(),
          responsableId: userIdA,
          clienteId: customerId
        });
      expect(actRes.status).toBe(201);
    });

    it('10. Lead → Actividades', async () => {
      // Necesitamos otro lead que no esté convertido
      const lead2 = await request(app.getHttpServer()).post('/leads').set('x-tenant-id', tenantA)
        .set('x-user-id', userIdA).send({ name: 'Maria', vendedorId: userIdA });
      const actRes = await request(app.getHttpServer())
        .post('/activities')
        .set('x-tenant-id', tenantA)
        .set('x-user-id', userIdA)
        .send({
          tipo: 'EMAIL',
          titulo: 'Enviar correo a lead',
          fecha: new Date().toISOString(),
          responsableId: userIdA,
          leadId: lead2.body.id
        });
      expect(actRes.status).toBe(201);
    });
  });

  describe('Validación de Dashboards y Reportes', () => {
    it('11. Dashboard → Datos reales', async () => {
      const res = await request(app.getHttpServer())
        .get('/dashboard/summary')
        .set('x-tenant-id', tenantA)
        .set('x-user-id', userIdA)
        .expect(200);
      
      const metrics = res.body;
      expect(Number(metrics.ventas.ventasDelMes)).toBe(1500); // 10 productos x 150
      expect(Number(metrics.clientes.nuevosDelMes)).toBeGreaterThanOrEqual(1);
      expect(Number(metrics.inventario.agotados)).toBe(0);
      expect(metrics.importaciones.activas).toBe(0); // Se cerró/recibió la importacion
    });

    it('12. Reportes → Datos reales', async () => {
      const res = await request(app.getHttpServer())
        .get('/reports/sales-by-period')
        .set('x-tenant-id', tenantA)
        .set('x-user-id', userIdA)
        .expect(200);
      
      expect(Number(res.body.totalVentas)).toBe(1500);
      expect(Number(res.body.cantidadPedidos)).toBe(1);
    });
  });

  describe('Auditoría y Aislamiento', () => {
    it('13. Aislamiento Multitenant', async () => {
      // El Tenant B no debería poder ver ni el dashboard, reportes, clientes o pedidos del Tenant A
      const dash = await request(app.getHttpServer())
        .get('/dashboard/summary')
        .set('x-tenant-id', tenantB)
        .set('x-user-id', userIdB);
      expect(dash.body.ventas?.ventasDelMes ?? 0).toBe(0);
      
      const ord = await request(app.getHttpServer())
        .get(`/orders/${orderId}`)
        .set('x-tenant-id', tenantB)
        .set('x-user-id', userIdB);
      expect(ord.status).toBe(404);
    });

    it('14. Auditoría', async () => {
      // Validamos que se hayan creado registros en AuditLog debido a nuestras mutaciones previas
      const logs = await prisma.auditLog.count({ where: { tenantId: tenantA } });
      expect(logs).toBeGreaterThan(0);
    });
  });
});
