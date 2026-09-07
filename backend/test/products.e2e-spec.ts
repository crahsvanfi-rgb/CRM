import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';

// Simulamos el guardia de Supabase para poder inyectar diferentes tenants
vi.mock('../src/common/guards/supabase-auth.guard.js', () => {
  return {
    SupabaseAuthGuard: class MockGuard {
      canActivate(context: any) {
        return true; // Permitimos el paso para pruebas e2e aislando RLS logic
      }
    }
  };
});

describe('ProductsController (e2e)', () => {
  let app: INestApplication;

  const tenantA = '11111111-1111-1111-1111-111111111111';
  const tenantB = '22222222-2222-2222-2222-222222222222';
  let createdProductIdA = '';
  let createdCategoryIdA = '';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Tenant A', () => {
    it('Debe crear una categoría', async () => {
      const res = await request(app.getHttpServer())
        .post('/categories')
        .set('x-tenant-id', tenantA)
        .send({ nombre: 'Electrónica', descripcion: 'Tests' })
        .expect(201);
      
      expect(res.body).toHaveProperty('id');
      expect(res.body.tenantId).toBe(tenantA);
      createdCategoryIdA = res.body.id;
    });

    it('Debe crear un producto', async () => {
      const res = await request(app.getHttpServer())
        .post('/products')
        .set('x-tenant-id', tenantA)
        .send({ 
          sku: 'SKU-A1', 
          nombre: 'Laptop', 
          precioVenta: 1000, 
          categoriaId: createdCategoryIdA 
        })
        .expect(201);
      
      expect(res.body).toHaveProperty('id');
      expect(res.body.tenantId).toBe(tenantA);
      createdProductIdA = res.body.id;
    });

    it('Debe fallar si el SKU ya existe en el mismo tenant', async () => {
      await request(app.getHttpServer())
        .post('/products')
        .set('x-tenant-id', tenantA)
        .send({ 
          sku: 'SKU-A1', 
          nombre: 'Otra Laptop', 
          precioVenta: 1000 
        })
        .expect(409);
    });

    it('Debe devolver el stock placeholder en ceros', async () => {
      const res = await request(app.getHttpServer())
        .get(`/products/${createdProductIdA}/stock`)
        .set('x-tenant-id', tenantA)
        .expect(200);

      expect(res.body).toEqual({ disponible: 0, reservado: 0, enTransito: 0 });
    });
  });

  describe('Tenant B (Aislamiento)', () => {
    it('Tenant B no debe ver la categoría de Tenant A', async () => {
      const res = await request(app.getHttpServer())
        .get('/categories')
        .set('x-tenant-id', tenantB)
        .expect(200);
      
      expect(res.body).toBeInstanceOf(Array);
      expect(res.body.length).toBe(0); // Tenant B starts clean
    });

    it('Tenant B no debe ver el producto de Tenant A', async () => {
      const res = await request(app.getHttpServer())
        .get('/products')
        .set('x-tenant-id', tenantB)
        .expect(200);
      
      expect(res.body.data).toBeInstanceOf(Array);
      expect(res.body.data.length).toBe(0);
    });

    it('Tenant B no debe poder consultar directamente el producto de Tenant A', async () => {
      await request(app.getHttpServer())
        .get(`/products/${createdProductIdA}`)
        .set('x-tenant-id', tenantB)
        .expect(404);
    });

    it('Tenant B puede crear el mismo SKU sin conflicto', async () => {
      const res = await request(app.getHttpServer())
        .post('/products')
        .set('x-tenant-id', tenantB)
        .send({ 
          sku: 'SKU-A1', 
          nombre: 'Laptop de B', 
          precioVenta: 1200 
        })
        .expect(201);
      
      expect(res.body).toHaveProperty('id');
      expect(res.body.tenantId).toBe(tenantB);
    });
  });

  describe('Soft Delete', () => {
    it('Debe hacer soft delete al producto en Tenant A', async () => {
      const res = await request(app.getHttpServer())
        .delete(`/products/${createdProductIdA}`)
        .set('x-tenant-id', tenantA)
        .expect(200);
        
      expect(res.body.estado).toBe('INACTIVO');
    });

    it('El producto no debe aparecer por defecto en findAll (Tenant A)', async () => {
      const res = await request(app.getHttpServer())
        .get('/products')
        .set('x-tenant-id', tenantA)
        .expect(200);
      
      const found = res.body.data.find((p: any) => p.id === createdProductIdA);
      expect(found).toBeUndefined(); // Por defecto trae estado ACTIVO
    });
  });
});
