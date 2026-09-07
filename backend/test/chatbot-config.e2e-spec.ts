import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { AppModule } from '../src/app.module.js';

describe('ChatbotConfigController (e2e)', () => {
  let app: INestApplication;
  let tenantId = 'test-tenant-123';
  let jwtToken = 'mock-jwt-token'; // En un entorno real se obtendría un token válido

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

  // Nota: Estas pruebas asumen que los guards están mockeados o configurados
  // para aceptar el 'mock-jwt-token'.
  
  it('/chatbot-config (GET)', () => {
    return request(app.getHttpServer())
      .get('/chatbot-config')
      .set('Authorization', `Bearer ${jwtToken}`)
      .expect(200)
      .expect(res => {
        expect(res.body).toHaveProperty('id');
      });
  });

  it('/chatbot-config (PUT)', () => {
    return request(app.getHttpServer())
      .put('/chatbot-config')
      .set('Authorization', `Bearer ${jwtToken}`)
      .send({ nombre: 'Bot E2E', activo: true })
      .expect(200)
      .expect(res => {
        expect(res.body.nombre).toBe('Bot E2E');
        expect(res.body.activo).toBe(true);
      });
  });
});
