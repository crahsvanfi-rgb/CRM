import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

describe('DashboardController (e2e)', () => {
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

  it('/dashboard/summary (GET) should not mix tenants', async () => {
    const resT1 = await request(app.getHttpServer())
      .get('/dashboard/summary')
      .set('x-tenant-id', tenant1)
      .expect(200);
      
    expect(resT1.body.ventas).toBeDefined();

    const resT2 = await request(app.getHttpServer())
      .get('/dashboard/summary')
      .set('x-tenant-id', tenant2)
      .expect(200);

    expect(resT2.body.ventas).toBeDefined();
  });
});
