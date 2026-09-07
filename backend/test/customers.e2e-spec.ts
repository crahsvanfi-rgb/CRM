import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from './../src/app.module.js';

describe('CustomersController (e2e)', () => {
  let app: INestApplication;
  
  const tenantA = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  const tenantB = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  let customerIdA: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('/customers (POST) - Crea cliente Tenant A', async () => {
    const res = await request(app.getHttpServer())
      .post('/customers')
      .set('x-tenant-id', tenantA)
      .send({ nombreComercial: 'Cliente A', nitCi: '111111' })
      .expect(201);
      
    expect(res.body.id).toBeDefined();
    expect(res.body.tenantId).toBe(tenantA);
    customerIdA = res.body.id;
  });

  it('/customers (POST) - Falla si el NIT está duplicado en el mismo Tenant', async () => {
    await request(app.getHttpServer())
      .post('/customers')
      .set('x-tenant-id', tenantA)
      .send({ nombreComercial: 'Cliente A Duplicado', nitCi: '111111' })
      .expect(409);
  });

  it('/customers (POST) - Permite mismo NIT en Tenant distinto', async () => {
    const res = await request(app.getHttpServer())
      .post('/customers')
      .set('x-tenant-id', tenantB)
      .send({ nombreComercial: 'Cliente B', nitCi: '111111' })
      .expect(201);
      
    expect(res.body.tenantId).toBe(tenantB);
  });

  it('/customers/:id (GET) - Aísla datos multitenant', async () => {
    await request(app.getHttpServer())
      .get(`/customers/${customerIdA}`)
      .set('x-tenant-id', tenantB) // B intentando ver el de A
      .expect(404);
  });
  
  it('/customers/:id/notes (POST) - Agrega nota al cliente', async () => {
    const res = await request(app.getHttpServer())
      .post(`/customers/${customerIdA}/notes`)
      .set('x-tenant-id', tenantA)
      .set('x-user-id', '00000000-0000-0000-0000-000000000000')
      .send({ nota: 'Llamar mañana' })
      .expect(201);
      
    expect(res.body.nota).toBe('Llamar mañana');
    expect(res.body.customerId).toBe(customerIdA);
  });
});
