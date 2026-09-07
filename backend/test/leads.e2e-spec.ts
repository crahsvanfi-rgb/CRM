import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import crypto from 'crypto';

describe('LeadsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  
  // Tenants simulados
  const tenantA = crypto.randomUUID();
  const tenantB = crypto.randomUUID();
  let leadIdA: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    await prisma.tenant.create({ data: { id: tenantA, name: 'Tenant A E2E' } });
    await prisma.tenant.create({ data: { id: tenantB, name: 'Tenant B E2E' } });
  });

  afterAll(async () => {
    await prisma.lead.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.customer.deleteMany({ where: { tenantId: { in: [tenantA, tenantB] } } });
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantA, tenantB] } } });
    await app.close();
  });

  it('/leads (POST) - Debe crear un lead para el Tenant A', async () => {
    const res = await request(app.getHttpServer())
      .post('/leads')
      .set('x-tenant-id', tenantA)
      .send({ name: 'Lead Tenant A', companyName: 'Empresa A' })
      .expect(201);
      
    expect(res.body.id).toBeDefined();
    expect(res.body.tenantId).toBe(tenantA);
    leadIdA = res.body.id;
  });

  it('/leads (POST) - Debe crear un lead para el Tenant B', async () => {
    const res = await request(app.getHttpServer())
      .post('/leads')
      .set('x-tenant-id', tenantB)
      .send({ name: 'Lead Tenant B', companyName: 'Empresa B' })
      .expect(201);
      
    expect(res.body.id).toBeDefined();
    expect(res.body.tenantId).toBe(tenantB);
  });

  it('/leads (GET) - Debe aislar datos y retornar solo los del Tenant A', async () => {
    const res = await request(app.getHttpServer())
      .get('/leads')
      .set('x-tenant-id', tenantA)
      .expect(200);
      
    expect(res.body.data).toBeInstanceOf(Array);
    // Verificamos que ninguno sea del tenant B (el aislamiento lo hace el Prisma Extension, pero lo validamos en los datos devueltos)
    const hasTenantB = res.body.data.some((lead: any) => lead.name === 'Lead Tenant B');
    expect(hasTenantB).toBe(false);
  });

  it('/leads/:id/convert (POST) - Debe rechazar la conversión si el lead no existe o es de otro tenant', async () => {
    await request(app.getHttpServer())
      .post(`/leads/${leadIdA}/convert`)
      .set('x-tenant-id', tenantB) // Intenta convertir un lead del Tenant A siendo del B
      .expect(404); // El servicio findOne lanza NotFound si no lo encuentra por tenantId
  });

  it('/leads/:id/convert (POST) - Debe convertir el lead y crear el cliente', async () => {
    const res = await request(app.getHttpServer())
      .post(`/leads/${leadIdA}/convert`)
      .set('x-tenant-id', tenantA)
      .expect(200);
      
    expect(res.body.lead.estado).toBe('GANADO');
    expect(res.body.customer).toBeDefined();
    expect(res.body.customer.leadId).toBe(leadIdA);
  });

  describe('LeadTouchpoints Endpoints', () => {
    let touchpointId: string;

    it('POST /leads/:id/touchpoints - Debe crear una interacción en el historial', async () => {
      const res = await request(app.getHttpServer())
        .post(`/leads/${leadIdA}/touchpoints`)
        .set('x-tenant-id', tenantA)
        .send({
          canal: 'WHATSAPP',
          resumen: 'Conversación de seguimiento por cotización de inversores',
          objeciones: 'Tiempos de entrega',
          puntosInteres: 'Garantía extendida',
          etapa: 'COTIZACION_ENVIADA',
        })
        .expect(201);

      expect(res.body.id).toBeDefined();
      expect(res.body.canal).toBe('WHATSAPP');
      expect(res.body.resumen).toBe('Conversación de seguimiento por cotización de inversores');
      touchpointId = res.body.id;
    });

    it('GET /leads/:id/touchpoints - Debe listar el historial de interacciones', async () => {
      const res = await request(app.getHttpServer())
        .get(`/leads/${leadIdA}/touchpoints`)
        .set('x-tenant-id', tenantA)
        .expect(200);

      expect(Array.isArray(res.body)).toBe(true);
      expect(res.body.length).toBeGreaterThanOrEqual(1);
      expect(res.body[0].id).toBe(touchpointId);
    });

    it('PATCH /leads/:id/touchpoints/:touchpointId - Debe actualizar la interacción', async () => {
      const res = await request(app.getHttpServer())
        .patch(`/leads/${leadIdA}/touchpoints/${touchpointId}`)
        .set('x-tenant-id', tenantA)
        .send({
          materialAbierto: true,
          resumen: 'Actualizado: Cliente confirmó interés y abrió catálogo',
        })
        .expect(200);

      expect(res.body.materialAbierto).toBe(true);
      expect(res.body.resumen).toContain('Actualizado');
    });

    it('DELETE /leads/:id/touchpoints/:touchpointId - Debe eliminar la interacción', async () => {
      await request(app.getHttpServer())
        .delete(`/leads/${leadIdA}/touchpoints/${touchpointId}`)
        .set('x-tenant-id', tenantA)
        .expect(204);

      const listRes = await request(app.getHttpServer())
        .get(`/leads/${leadIdA}/touchpoints`)
        .set('x-tenant-id', tenantA)
        .expect(200);

      expect(listRes.body.some((tp: any) => tp.id === touchpointId)).toBe(false);
    });
  });
});
