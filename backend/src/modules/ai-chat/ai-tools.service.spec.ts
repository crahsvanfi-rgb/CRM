import { Test, TestingModule } from '@nestjs/testing';
import { AiToolsService } from './ai-tools.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { vi, describe, beforeEach, afterEach, it, expect } from 'vitest';

describe('AiToolsService', () => {
  let service: AiToolsService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    getTenantClient: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiToolsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<AiToolsService>(AiToolsService);
    prismaService = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSalesSummary', () => {
    it('debería calcular el total de ventas para Admin', async () => {
      const tenantClientMock = {
        order: {
          findMany: vi.fn().mockResolvedValue([
            { total: 100 },
            { total: 200 }
          ]),
        },
      };
      mockPrismaService.getTenantClient.mockReturnValue(tenantClientMock);

      const result = await (service as any).getSalesSummary('tenant-123', 'Admin', 'mes_actual');
      expect(result.totalFacturadoUSD).toBe(300);
    });
  });

  // FASE 3.3 TESTS
  describe('searchCustomerByName', () => {
    it('debería retornar error si no encuentra cliente por nombre', async () => {
      const tenantClientMock = { customer: { findMany: vi.fn().mockResolvedValue([]) } };
      mockPrismaService.getTenantClient.mockReturnValue(tenantClientMock);
      const result = await (service as any).searchCustomerByName('tenant-1', 'Juan Pérez');
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('Cliente no encontrado');
    });

    it('debería retornar listado de clientes encontrados', async () => {
      const tenantClientMock = { customer: { findMany: vi.fn().mockResolvedValue([{ id: '1', nombreComercial: 'Empresa A' }]) } };
      mockPrismaService.getTenantClient.mockReturnValue(tenantClientMock);
      const result = await (service as any).searchCustomerByName('tenant-1', 'Empresa A');
      expect(result.resultados[0].nombreComercial).toBe('Empresa A');
    });
  });

  describe('detectInactiveCustomers', () => {
    it('debería retornar la cuenta de clientes inactivos', async () => {
      const tenantClientMock = { customer: { findMany: vi.fn().mockResolvedValue([{ nombreComercial: 'Inactivo 1' }, { nombreComercial: 'Inactivo 2' }]) } };
      mockPrismaService.getTenantClient.mockReturnValue(tenantClientMock);
      const result = await (service as any).getInactiveCustomers('tenant-1', 90);
      expect(result.totalClientesInactivos).toBe(2);
      expect(result.diasInactividad).toBe(90);
    });
  });

  describe('getCustomerSummary', () => {
    it('debería recomendar reactivación para cliente VIP inactivo', async () => {
      const hace2Meses = new Date();
      hace2Meses.setDate(hace2Meses.getDate() - 60);

      const tenantClientMock = {
        customer: { findUnique: vi.fn().mockResolvedValue({ nombreComercial: 'VIP Inactivo', nitCi: '123' }) },
        quote: { findMany: vi.fn().mockResolvedValue([]) },
        order: { findMany: vi.fn().mockResolvedValue([ { total: '6000', fecha: hace2Meses, items: [] } ]) },
        activity: { findMany: vi.fn().mockResolvedValue([]) }
      };
      mockPrismaService.getTenantClient.mockReturnValue(tenantClientMock);

      const result = await (service as any).getCustomerSummary('tenant-1', 'Admin', 'cliente-id');
      expect(result.comprasAcumuladasUSD).toBe(6000);
      expect(result.recomendacion).toContain('Sugerencia: Contactar urgente para reactivación');
    });
  });

  describe('detectHighValueCustomers', () => {
    it('debería retornar el top de clientes con mayor facturación', async () => {
      const tenantClientMock = {
        order: {
          findMany: vi.fn().mockResolvedValue([
            { total: '1000', cliente: { id: 'c1', nombreComercial: 'Cliente Uno' } },
            { total: '500', cliente: { id: 'c2', nombreComercial: 'Cliente Dos' } },
            { total: '2000', cliente: { id: 'c1', nombreComercial: 'Cliente Uno' } },
          ])
        }
      };
      mockPrismaService.getTenantClient.mockReturnValue(tenantClientMock);

      const result = await (service as any).detectHighValueCustomers('tenant-1', 'Admin');
      expect(result.topVIP).toBeDefined();
      expect(result.topVIP.length).toBe(2);
      expect(result.topVIP[0].nombre).toBe('Cliente Uno');
      expect(result.topVIP[0].facturacionUSD).toBe(3000); // 1000 + 2000
      expect(result.topVIP[1].nombre).toBe('Cliente Dos');
      expect(result.topVIP[1].facturacionUSD).toBe(500);
    });
  });

  // FASE 3.4 TESTS
  describe('Inventario - getLowStockProducts', () => {
    it('debería retornar productos con stock menor o igual al mínimo', async () => {
      const tenantClientMock = {
        product: {
          findMany: vi.fn().mockResolvedValue([
            { sku: 'P1', nombre: 'Prod 1', stockMinimo: 10, productStock: { stockFisico: 5, stockReservado: 0 } },
            { sku: 'P2', nombre: 'Prod 2', stockMinimo: 10, productStock: { stockFisico: 15, stockReservado: 0 } },
            { sku: 'P3', nombre: 'Prod 3', stockMinimo: 20, productStock: { stockFisico: 25, stockReservado: 10 } }, // disp = 15 <= 20
          ])
        }
      };
      mockPrismaService.getTenantClient.mockReturnValue(tenantClientMock);

      const result = await (service as any).getLowStockProducts('tenant-1', 10);
      expect(result.totalBajoStock).toBe(2);
      expect(result.productos[0].sku).toBe('P1');
      expect(result.productos[1].sku).toBe('P3');
    });
  });

  describe('Inventario - getOutOfStockProducts', () => {
    it('debería retornar productos con stock disponible 0 o negativo', async () => {
      const tenantClientMock = {
        product: {
          findMany: vi.fn().mockResolvedValue([
            { sku: 'P1', nombre: 'Prod 1', stockMinimo: 10, productStock: { stockFisico: 0, stockReservado: 0 } },
            { sku: 'P2', nombre: 'Prod 2', stockMinimo: 10, productStock: { stockFisico: 5, stockReservado: 5 } }, // disp = 0
            { sku: 'P3', nombre: 'Prod 3', stockMinimo: 10, productStock: { stockFisico: 10, stockReservado: 0 } }, // disp = 10
          ])
        }
      };
      mockPrismaService.getTenantClient.mockReturnValue(tenantClientMock);

      const result = await (service as any).getOutOfStockProducts('tenant-1');
      expect(result.totalAgotados).toBe(2);
    });
  });

  describe('Inventario - recommendReorderProducts', () => {
    it('debería recomendar reimportación si el stock + transito no cubre la demanda de 90 dias', async () => {
      const tenantClientMock = {
        product: {
          findMany: vi.fn().mockResolvedValue([
            { 
              sku: 'P1', nombre: 'Prod 1', stockMinimo: 10, 
              productStock: { stockFisico: 20, stockReservado: 0, stockTransito: 0 },
              orderItems: [
                { cantidad: 300 } // En 90 dias vendió 300. Promedio mensual = 100. (Promedio * 2) = 200.
              ] 
            }
          ])
        }
      };
      mockPrismaService.getTenantClient.mockReturnValue(tenantClientMock);

      const result = await (service as any).recommendReorderProducts('tenant-1', 'Admin');
      expect(result.reimportacionesSugeridas).toBeDefined();
      expect(result.reimportacionesSugeridas.length).toBe(1);
      // Sugerido = (100 * 2) - 20 - 0 = 180
      expect(result.reimportacionesSugeridas[0].sugeridoImportar).toBe(180);
    });
  });

  describe('Inventario - RBAC', () => {
    it('debería bloquear a Vendedor en getInventorySummary', async () => {
      const result = await (service as any).getInventorySummary('tenant-1', 'Vendedor');
      expect(result).toHaveProperty('error');
      expect(result.error).toContain('Permiso denegado');
    });
  });
  
  // FASE 3.5 TESTS
  describe('Ventas - getSalesSummary', () => {
    it('debería calcular el total de ventas, pedidos y ticket promedio', async () => {
      const tenantClientMock = {
        order: {
          findMany: vi.fn().mockImplementation((args: any) => {
            const now = new Date();
            const gteDate = new Date(args.where.updatedAt.gte);
            // Si el gte es de este mes, devolvemos el current period
            if (gteDate.getMonth() === now.getMonth() && gteDate.getFullYear() === now.getFullYear()) {
              return Promise.resolve([{ total: 100 }, { total: 300 }]);
            }
            // De lo contrario (mes anterior), devolvemos el prev period
            return Promise.resolve([{ total: 200 }]); 
          })
        }
      };
      mockPrismaService.getTenantClient.mockReturnValue(tenantClientMock);

      const result = await (service as any).getSalesSummary('tenant-1', 'Admin', 'mes');
      expect(result.totalFacturadoUSD).toBe(400);
      expect(result.pedidosEntregados).toBe(2);
      expect(result.ticketPromedioUSD).toBe(200);
      expect(result.comparacionPeriodoAnterior.totalFacturadoUSD).toBe(200);
      expect(result.comparacionPeriodoAnterior.variacionPorcentual).toBe(100); // (400-200)/200 * 100
    });
  });

  describe('Ventas - getSalesByVendor RBAC', () => {
    it('debería filtrar ventas solo del vendedor autenticado', async () => {
      const tenantClientMock = {
        order: {
          findMany: vi.fn().mockImplementation((args: any) => {
            // Verify that the where clause includes the vendedorId
            expect(args.where.vendedorId).toBe('vendedor-123');
            return Promise.resolve([
              { total: 50, vendedor: { name: 'Juan' } },
              { total: 150, vendedor: { name: 'Juan' } }
            ]);
          })
        }
      };
      mockPrismaService.getTenantClient.mockReturnValue(tenantClientMock);

      const result = await (service as any).getSalesByVendor('tenant-1', 'Vendedor', 'vendedor-123', 'mes');
      expect(result.totalVentasGrupales).toBe(200);
      expect(result.ventasPorVendedor.length).toBe(1);
      expect(result.ventasPorVendedor[0].nombre).toBe('Juan');
    });
  });

  describe('Ventas - getCommercialRecommendations', () => {
    it('debería generar recomendaciones basadas en reglas de negocio', async () => {
      const tenantClientMock = {
        customer: {
          findMany: vi.fn().mockResolvedValue([
            { nombreComercial: 'VIP Inactivo', orders: [{ total: 6000 }] }
          ])
        },
        quote: {
          findMany: vi.fn().mockResolvedValue([
            { numero: 'Q-001', total: 1000, cliente: { nombreComercial: 'Cliente C' }, vendedor: { name: 'Pedro' } }
          ])
        },
        product: {
          findMany: vi.fn().mockResolvedValue([
            { nombre: 'Prod Estancado', sku: 'SKU1', stockMinimo: 10, productStock: { stockFisico: 50, stockReservado: 0 }, orderItems: [] }
          ])
        }
      };
      mockPrismaService.getTenantClient.mockReturnValue(tenantClientMock);

      const result = await (service as any).getCommercialRecommendations('tenant-1', 'Admin');
      expect(result.recomendacionesAccionables).toBeDefined();
      expect(result.recomendacionesAccionables.length).toBe(3);
      
      const recVIP = result.recomendacionesAccionables.find((r: any) => r.tipo === 'RETENCION_VIP');
      expect(recVIP.detalles.length).toBe(1);
      expect(recVIP.detalles[0].nombreComercial).toBe('VIP Inactivo');

      const recCot = result.recomendacionesAccionables.find((r: any) => r.tipo === 'SEGUIMIENTO_COTIZACIONES');
      expect(recCot.detalles.length).toBe(1);
      expect(recCot.detalles[0].num).toBe('Q-001');

      const recProd = result.recomendacionesAccionables.find((r: any) => r.tipo === 'PROMOCION_PRODUCTOS');
      expect(recProd.detalles.length).toBe(1);
      expect(recProd.detalles[0].nombre).toBe('Prod Estancado');
    });
  });

  describe('getLeadHistory', () => {
    it('debería retornar el historial estructurado de interacciones del lead', async () => {
      const mockLead = {
        id: 'lead-123',
        leadId: 'LEAD-005',
        name: 'Roberto Gomez',
        companyName: 'TecnoGlobal SRL',
        phone: '+59171234567',
        email: 'roberto@tecnoglobal.com',
        estado: 'INTERESADO',
        productoInteres: 'Inversores',
        vendedor: { name: 'Carlos Vendedor', email: 'carlos@crm.com' },
        touchpoints: [
          {
            id: 'tp-1',
            canal: 'WHATSAPP',
            fecha: new Date(),
            etapa: 'COTIZACION_ENVIADA',
            resumen: 'Se envió cotización con descuento 5%',
            objeciones: 'Requiere crédito a 30 días',
            puntosInteres: 'Inversor 5kW',
          },
        ],
        activities: [],
      };

      const tenantClientMock = {
        lead: {
          findFirst: vi.fn().mockResolvedValue(mockLead),
        },
      };
      mockPrismaService.getTenantClient.mockReturnValue(tenantClientMock);

      const result = await service.executeTool(
        'getLeadHistory',
        { leadId: 'LEAD-005' },
        'tenant-1',
        'Vendedor',
        'user-1',
      );

      expect(result.id).toBe('lead-123');
      expect(result.codigo).toBe('LEAD-005');
      expect(result.historialInteracciones.length).toBe(1);
      expect(result.historialInteracciones[0].objeciones).toBe('Requiere crédito a 30 días');
    });
  });
});
