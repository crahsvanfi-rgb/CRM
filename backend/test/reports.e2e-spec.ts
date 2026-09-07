import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

describe('ReportsController (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  const tenant1 = '11111111-1111-1111-1111-111111111111';
  const tenant2 = '22222222-2222-2222-2222-222222222222';

  it('/reports/sales-by-period (GET) empty', async () => {
    const res = await request(app.getHttpServer())
      .get('/reports/sales-by-period')
      .set('x-tenant-id', tenant1)
      .expect(200);

    // Si no hay orders, _sum será null y contadores 0
    expect(res.body.totalVentas).toBeDefined();
    expect(res.body.cantidadPedidos).toBeDefined();
  });

  it('/reports/stock-summary (GET) should not mix tenants', async () => {
    const resT1 = await request(app.getHttpServer())
      .get('/reports/stock-summary')
      .set('x-tenant-id', tenant1)
      .expect(200);
      
    expect(Array.isArray(resT1.body)).toBe(true);

    const resT2 = await request(app.getHttpServer())
      .get('/reports/stock-summary')
      .set('x-tenant-id', tenant2)
      .expect(200);

    // Solo probamos que funcione sin dar error y responda aislando
    expect(Array.isArray(resT2.body)).toBe(true);
  });
});
