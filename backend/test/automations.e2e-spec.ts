import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { AuthService } from '../src/core/auth/auth.service.js';

describe('AutomationsController (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let authService: AuthService;

  let tenantA_Id: string;
  let tenantB_Id: string;
  let adminAToken: string;
  let vendorAToken: string;
  let adminBToken: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();

    prisma = app.get(PrismaService);
    authService = app.get(AuthService);

    // Setup Test Data
    const tenantA = await prisma.tenant.create({ data: { name: 'Tenant A', domain: 'test-a.com' } });
    const tenantB = await prisma.tenant.create({ data: { name: 'Tenant B', domain: 'test-b.com' } });
    tenantA_Id = tenantA.id;
    tenantB_Id = tenantB.id;

    // Roles
    const roleAdmin = await prisma.role.create({ data: { name: 'Admin', isSystemRole: true, tenantId: tenantA_Id } });
    const roleVendor = await prisma.role.create({ data: { name: 'Vendedor', isSystemRole: true, tenantId: tenantA_Id } });
    
    // Users
    const adminA = await prisma.user.create({ data: { id: 'uuid-admin-a', email: 'admin-a@test.com', tenantId: tenantA_Id, roleId: roleAdmin.id } });
    const vendorA = await prisma.user.create({ data: { id: 'uuid-vendor-a', email: 'vendor-a@test.com', tenantId: tenantA_Id, roleId: roleVendor.id } });
    const adminB = await prisma.user.create({ data: { id: 'uuid-admin-b', email: 'admin-b@test.com', tenantId: tenantB_Id, roleId: roleAdmin.id } });

    // Mock Tokens
    adminAToken = authService.generateToken(adminA);
    vendorAToken = authService.generateToken(vendorA);
    adminBToken = authService.generateToken(adminB);
  });

  afterAll(async () => {
    // Cleanup
    await prisma.tenant.deleteMany({ where: { id: { in: [tenantA_Id, tenantB_Id] } } });
    await app.close();
  });

  describe('/automations (POST)', () => {
    it('should allow Admin to create an automation', async () => {
      const res = await request(app.getHttpServer())
        .post('/automations')
        .set('Authorization', `Bearer ${adminAToken}`)
        .send({
          nombre: 'Test Automation',
          evento: 'COTIZACION_SIN_RESPUESTA',
          accion: 'CREAR_ACTIVIDAD',
          condiciones: { dias: 3 },
          configuracionAccion: { tipoActividad: 'SEGUIMIENTO' }
        });
      
      expect(res.status).toBe(201);
      expect(res.body).toHaveProperty('id');
      expect(res.body.tenantId).toBe(tenantA_Id);
      expect(res.body.nombre).toBe('Test Automation');
    });

    it('should deny Vendedor from creating an automation', async () => {
      const res = await request(app.getHttpServer())
        .post('/automations')
        .set('Authorization', `Bearer ${vendorAToken}`)
        .send({
          nombre: 'Vendor Rule',
          evento: 'STOCK_BAJO',
          accion: 'GENERAR_ALERTA'
        });
      
      expect(res.status).toBe(403);
    });
  });

  describe('/automations (GET)', () => {
    it('should isolate automations between tenants', async () => {
      // List for Tenant A
      const resA = await request(app.getHttpServer())
        .get('/automations')
        .set('Authorization', `Bearer ${adminAToken}`);
      expect(resA.status).toBe(200);
      expect(resA.body.items.length).toBeGreaterThan(0);

      // List for Tenant B (should be empty initially)
      const resB = await request(app.getHttpServer())
        .get('/automations')
        .set('Authorization', `Bearer ${adminBToken}`);
      expect(resB.status).toBe(200);
      expect(resB.body.items.length).toBe(0);
    });
  });
});
