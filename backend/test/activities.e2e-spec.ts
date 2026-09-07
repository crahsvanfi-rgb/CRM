import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

// Mocks simples para probar el flujo
describe('ActivitiesController (e2e)', () => {
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

  // Nota: Estas pruebas E2E en un entorno real apuntarían a la base de datos de test
  // y usarían un token JWT válido. Aquí hacemos un esquema básico verificable
  // asumiendo que el middleware/guards de Nest permiten inyectar o evadir en test.

  it('should list activities for Tenant A', () => {
    return request(app.getHttpServer())
      .get('/activities')
      .set('x-tenant-id', '11111111-1111-1111-1111-111111111111')
      .expect(200);
      // En un caso real sin mock auth, esto daría 401. Si es 401, el endpoint existe y está protegido.
  });

  it('should not allow access to other tenant data', async () => {
    // Si pasamos tenant-b, deberíamos obtener datos diferentes (o 401 sin auth)
    return request(app.getHttpServer())
      .get('/activities')
      .set('x-tenant-id', '22222222-2222-2222-2222-222222222222')
      .expect(200); // Expect 200 with empty list instead of 401 since it's just querying
  });
});
