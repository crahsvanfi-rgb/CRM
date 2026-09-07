import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { EncryptionService } from '../src/common/services/encryption.service.js';
import { vi, describe, beforeAll, afterAll, it, expect } from 'vitest';
import crypto from 'crypto';

describe('AI Chat Module (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let encryption: EncryptionService;
  
  const tenantA = crypto.randomUUID();
  let userIdA: string;
  let userIdVendedor: string;
  let convId: string;

  const tenantB = crypto.randomUUID();
  let userIdB: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    
    prisma = app.get(PrismaService);
    encryption = app.get(EncryptionService);
    
    // Limpieza
    const deleteOps = [
      prisma.aIMessage.deleteMany(),
      prisma.aIUsageLog.deleteMany(),
      prisma.aIConversation.deleteMany(),
      prisma.aIConfiguration.deleteMany(),
      prisma.auditLog.deleteMany(),
      prisma.user.deleteMany(),
      prisma.role.deleteMany(),
      prisma.tenant.deleteMany()
    ];
    await prisma.$transaction(deleteOps);

    // Setup base
    await prisma.tenant.create({ data: { id: tenantA, name: 'Tenant Chat A' } });
    const roleA = await prisma.role.create({ data: { tenantId: tenantA, name: 'Admin', permissions: {} } });
    const userA = await prisma.user.create({ data: { id: crypto.randomUUID(), email: 'adminchat@a.com', tenantId: tenantA, roleId: roleA.id } });
    userIdA = userA.id;

    const roleVendedor = await prisma.role.create({ data: { tenantId: tenantA, name: 'Vendedor', permissions: {} } });
    const userVendedor = await prisma.user.create({ data: { id: crypto.randomUUID(), email: 'vendedor@a.com', tenantId: tenantA, roleId: roleVendedor.id } });
    userIdVendedor = userVendedor.id;

    // Configurar IA para el tenant
    await prisma.aIConfiguration.create({
      data: {
        tenantId: tenantA,
        habilitada: true,
        apiKey: encryption.encrypt('sk-or-fake-key'),
        modelo: 'openai/gpt-4o-mini'
      }
    });

    // Setup Tenant B
    await prisma.tenant.create({ data: { id: tenantB, name: 'Tenant Chat B' } });
    const roleB = await prisma.role.create({ data: { tenantId: tenantB, name: 'Admin', permissions: {} } });
    const userB = await prisma.user.create({ data: { id: crypto.randomUUID(), email: 'adminchat@b.com', tenantId: tenantB, roleId: roleB.id } });
    userIdB = userB.id;
    await prisma.customer.create({
      data: {
        id: crypto.randomUUID(),
        tenantId: tenantB,
        nombreComercial: 'Cliente Exclusivo Tenant B',
        nitCi: '999999',
        telefono: '123'
      }
    });
  });

  afterAll(async () => {
    await app.close();
  });

  it('1. POST /ai-chat/conversations (Crear conversación)', async () => {
    const res = await request(app.getHttpServer())
      .post('/ai-chat/conversations')
      .set('x-tenant-id', tenantA)
      .set('x-user-id', userIdA)
      .send({ titulo: 'Chat de Prueba' })
      .expect(201);

    expect(res.body.titulo).toBe('Chat de Prueba');
    expect(res.body.usuarioId).toBe(userIdA);
    convId = res.body.id;
  });

  it('2. POST /ai-chat/conversations/:id/messages (Probar llamada con Function Calling mock)', async () => {
    // Mock de fetch para simular OpenRouter con tool calls
    const originalFetch = global.fetch;
    
    global.fetch = vi.fn().mockImplementationOnce(async (url: string, options: any) => {
      const body = JSON.parse(options.body);
      
      // En la primera llamada, el modelo decide usar una tool
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                role: 'assistant',
                tool_calls: [
                  {
                    id: 'call_123',
                    type: 'function',
                    function: {
                      name: 'getSalesSummary',
                      arguments: '{"periodo":"mes_actual"}'
                    }
                  }
                ]
              }
            }
          ],
          usage: { total_tokens: 50 }
        })
      };
    }).mockImplementationOnce(async (url: string, options: any) => {
      // En la segunda llamada, el modelo da la respuesta final tras recibir el tool result
      const body = JSON.parse(options.body);
      // Validar que en los mensajes ahora viene el resultado de la tool
      const toolMessage = body.messages.find((m: any) => m.role === 'tool');
      expect(toolMessage).toBeDefined();
      expect(toolMessage.name).toBe('getSalesSummary');
      
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Las ventas de este mes son 0 USD y tienes 0 pedidos.'
              }
            }
          ],
          usage: { total_tokens: 100 }
        })
      };
    }) as any;

    const res = await request(app.getHttpServer())
      .post(`/ai-chat/conversations/${convId}/messages`)
      .set('x-tenant-id', tenantA)
      .set('x-user-id', userIdA)
      .send({ contenido: '¿Cuáles son las ventas del mes?' })
      .expect(201);

    expect(res.body.respuesta).toContain('0 USD');
    
    // Verificar en BD
    const conv = await prisma.aIConversation.findUnique({
      where: { id: convId },
      include: { messages: true, usageLogs: true }
    });
    
    expect(conv?.messages.length).toBe(2); // USER (pregunta) y ASSISTANT (respuesta final)
    expect(conv?.usageLogs.length).toBe(1);
    expect(conv?.usageLogs[0].estado).toBe('EXITOSO');
    expect(conv?.usageLogs[0].tokensUsados).toBe(150);

    global.fetch = originalFetch;
  });

  it('3. GET /ai-chat/conversations (Listar conversaciones)', async () => {
    const res = await request(app.getHttpServer())
      .get('/ai-chat/conversations')
      .set('x-tenant-id', tenantA)
      .set('x-user-id', userIdA)
      .expect(200);

    expect(res.body.items.length).toBe(1);
    expect(res.body.items[0].id).toBe(convId);
  });

  it('4. PATCH /ai-chat/conversations/:id (Renombrar)', async () => {
    const res = await request(app.getHttpServer())
      .patch(`/ai-chat/conversations/${convId}`)
      .set('x-tenant-id', tenantA)
      .set('x-user-id', userIdA)
      .send({ titulo: 'Ventas Mensuales' })
      .expect(200);

    expect(res.body.titulo).toBe('Ventas Mensuales');
  });

  it('5. POST /ai-chat/conversations/:id/messages (RBAC en detectHighValueCustomers)', async () => {
    // Mock para que OpenRouter pida la herramienta detectHighValueCustomers
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementationOnce(async () => {
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                role: 'assistant',
                tool_calls: [
                  { id: 'call_999', type: 'function', function: { name: 'detectHighValueCustomers', arguments: '{}' } }
                ]
              }
            }
          ],
          usage: { total_tokens: 10 }
        })
      };
    }).mockImplementationOnce(async (url: string, options: any) => {
      const body = JSON.parse(options.body);
      const toolMessage = body.messages.find((m: any) => m.role === 'tool');
      // Debe contener el error de permiso
      expect(toolMessage.content).toContain('Permiso denegado');
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'No tengo permisos para ver eso.' } }],
          usage: { total_tokens: 20 }
        })
      };
    }) as any;

    const res = await request(app.getHttpServer())
      .post(`/ai-chat/conversations/${convId}/messages`)
      .set('x-tenant-id', tenantA)
      .set('x-user-id', userIdVendedor)
      .send({ contenido: 'Dime los clientes VIP' })
      .expect(201);

    expect(res.body.respuesta).toContain('permiso');
    global.fetch = originalFetch;
  });

  it('6. POST /ai-chat/conversations/:id/messages (Aislamiento Multitenant en searchCustomerByName)', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementationOnce(async () => {
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                role: 'assistant',
                tool_calls: [
                  { id: 'call_multi', type: 'function', function: { name: 'searchCustomerByName', arguments: '{"nombre":"Cliente Exclusivo Tenant B"}' } }
                ]
              }
            }
          ],
          usage: { total_tokens: 10 }
        })
      };
    }).mockImplementationOnce(async (url: string, options: any) => {
      const body = JSON.parse(options.body);
      const toolMessage = body.messages.find((m: any) => m.role === 'tool');
      // Aseguramos que la herramienta no encontró al cliente del Tenant B
      expect(toolMessage.content).toContain('Cliente no encontrado con nombre');
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'No pude encontrar a ese cliente.' } }],
          usage: { total_tokens: 20 }
        })
      };
    }) as any;

    const res = await request(app.getHttpServer())
      .post(`/ai-chat/conversations/${convId}/messages`)
      .set('x-tenant-id', tenantA)
      .set('x-user-id', userIdA)
      .send({ contenido: 'Busca a Cliente Exclusivo Tenant B' })
      .expect(201);

    expect(res.body.respuesta).toContain('No pude encontrar');
    global.fetch = originalFetch;
  });

  it('7. POST /ai-chat/conversations/:id/messages (Inventario - recommendReorderProducts)', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementationOnce(async () => {
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                role: 'assistant',
                tool_calls: [
                  { id: 'call_reorder', type: 'function', function: { name: 'recommendReorderProducts', arguments: '{}' } }
                ]
              }
            }
          ],
          usage: { total_tokens: 10 }
        })
      };
    }).mockImplementationOnce(async (url: string, options: any) => {
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'Te recomiendo reimportar estos productos.' } }],
          usage: { total_tokens: 20 }
        })
      };
    }) as any;

    const res = await request(app.getHttpServer())
      .post(`/ai-chat/conversations/${convId}/messages`)
      .set('x-tenant-id', tenantA)
      .set('x-user-id', userIdA) // Admin
      .send({ contenido: 'Qué debería reimportar?' })
      .expect(201);

    expect(res.body.respuesta).toContain('reimportar');
    global.fetch = originalFetch;
  });

  it('8. POST /ai-chat/conversations/:id/messages (Inventario - RBAC en getInventorySummary)', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementationOnce(async () => {
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                role: 'assistant',
                tool_calls: [
                  { id: 'call_inv', type: 'function', function: { name: 'getInventorySummary', arguments: '{}' } }
                ]
              }
            }
          ],
          usage: { total_tokens: 10 }
        })
      };
    }).mockImplementationOnce(async (url: string, options: any) => {
      const body = JSON.parse(options.body);
      const toolMessage = body.messages.find((m: any) => m.role === 'tool');
      expect(toolMessage.content).toContain('Permiso denegado');
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'No tengo acceso al resumen de inventario.' } }],
          usage: { total_tokens: 20 }
        })
      };
    }) as any;

    const res = await request(app.getHttpServer())
      .post(`/ai-chat/conversations/${convId}/messages`)
      .set('x-tenant-id', tenantA)
      .set('x-user-id', userIdVendedor) // Vendedor
      .send({ contenido: 'Dame el resumen del inventario' })
      .expect(201);

    expect(res.body.respuesta).toContain('acceso');
    global.fetch = originalFetch;
  });

  // --- FASE 3.5 TESTS E2E ---

  it('9. POST /ai-chat/conversations/:id/messages (FASE 3.5 - Flujo Completo Análisis Ventas)', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementationOnce(async () => {
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                role: 'assistant',
                tool_calls: [
                  { id: 'call_sales', type: 'function', function: { name: 'getSalesSummary', arguments: '{"periodo":"mes"}' } }
                ]
              }
            }
          ],
          usage: { total_tokens: 10 }
        })
      };
    }).mockImplementationOnce(async (url: string, options: any) => {
      const body = JSON.parse(options.body);
      const toolMessage = body.messages.find((m: any) => m.role === 'tool');
      expect(toolMessage).toBeDefined();
      expect(toolMessage.content).toContain('totalFacturadoUSD');
      
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'Aquí está el análisis de ventas del mes.' } }],
          usage: { total_tokens: 20 }
        })
      };
    }) as any;

    const res = await request(app.getHttpServer())
      .post(`/ai-chat/conversations/${convId}/messages`)
      .set('x-tenant-id', tenantA)
      .set('x-user-id', userIdA) // Admin
      .send({ contenido: 'Analiza mis ventas de este mes' })
      .expect(201);

    expect(res.body.respuesta).toContain('análisis de ventas');
    global.fetch = originalFetch;
  });

  it('10. POST /ai-chat/conversations/:id/messages (FASE 3.5 - RBAC Vendedor en Resumen Global)', async () => {
    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementationOnce(async () => {
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                role: 'assistant',
                tool_calls: [
                  { id: 'call_sales2', type: 'function', function: { name: 'getSalesSummary', arguments: '{"periodo":"mes"}' } }
                ]
              }
            }
          ],
          usage: { total_tokens: 10 }
        })
      };
    }).mockImplementationOnce(async (url: string, options: any) => {
      const body = JSON.parse(options.body);
      const toolMessage = body.messages.find((m: any) => m.role === 'tool');
      expect(toolMessage.content).toContain('Permiso denegado');
      
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'No tienes permiso para ver el resumen global.' } }],
          usage: { total_tokens: 20 }
        })
      };
    }) as any;

    const res = await request(app.getHttpServer())
      .post(`/ai-chat/conversations/${convId}/messages`)
      .set('x-tenant-id', tenantA)
      .set('x-user-id', userIdVendedor) // Vendedor
      .send({ contenido: 'Muéstrame el resumen global de ventas' })
      .expect(201);

    expect(res.body.respuesta).toContain('permiso');
    global.fetch = originalFetch;
  });

  it('11. POST /ai-chat/conversations/:id/messages (FASE 3.5 - Multitenant Aislamiento en getSalesByCustomer)', async () => {
    // Creamos una orden en el tenant B para Cliente Exclusivo
    const clienteB = await prisma.customer.findFirst({ where: { tenantId: tenantB } });
    await prisma.order.create({
      data: {
        id: crypto.randomUUID(),
        tenantId: tenantB,
        clienteId: clienteB!.id,
        vendedorId: userIdB,
        numero: 'ORD-B-1',
        total: 5000,
        estado: 'ENTREGADO'
      }
    });

    const originalFetch = global.fetch;
    global.fetch = vi.fn().mockImplementationOnce(async () => {
      return {
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                role: 'assistant',
                tool_calls: [
                  { id: 'call_sales_cust', type: 'function', function: { name: 'getSalesByCustomer', arguments: '{"periodo":"mes"}' } }
                ]
              }
            }
          ],
          usage: { total_tokens: 10 }
        })
      };
    }).mockImplementationOnce(async (url: string, options: any) => {
      const body = JSON.parse(options.body);
      const toolMessage = body.messages.find((m: any) => m.role === 'tool');
      // Asegurar que Cliente Exclusivo Tenant B no aparece para Tenant A
      expect(toolMessage.content).not.toContain('Cliente Exclusivo Tenant B');
      
      return {
        ok: true,
        json: async () => ({
          choices: [{ message: { role: 'assistant', content: 'Ventas por cliente mostradas.' } }],
          usage: { total_tokens: 20 }
        })
      };
    }) as any;

    const res = await request(app.getHttpServer())
      .post(`/ai-chat/conversations/${convId}/messages`)
      .set('x-tenant-id', tenantA)
      .set('x-user-id', userIdA) // Admin Tenant A
      .send({ contenido: 'Dime las ventas por cliente' })
      .expect(201);

    expect(res.body.respuesta).toContain('Ventas por cliente');
    global.fetch = originalFetch;
  });
});
