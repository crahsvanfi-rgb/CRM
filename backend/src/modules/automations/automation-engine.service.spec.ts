import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { AutomationEngineService } from './automation-engine.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Logger } from '@nestjs/common';
import { AutomationEvent, AutomationAction, ExecutionStatus } from '@prisma/client';

describe('AutomationEngineService', () => {
  let service: AutomationEngineService;
  let prismaService: PrismaService;

  const mockTenantClient = {
    automation: {
      findMany: vi.fn().mockResolvedValue([]),
      findUnique: vi.fn().mockResolvedValue(null),
    },
    automationExecution: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: '1' }),
    },
    quote: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    product: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    customer: {
      findMany: vi.fn().mockResolvedValue([]),
    },
    activity: {
      create: vi.fn().mockResolvedValue({ id: 'act-1' }),
      findMany: vi.fn().mockResolvedValue([]),
    },
    recommendation: {
      findFirst: vi.fn().mockResolvedValue(null),
      create: vi.fn().mockResolvedValue({ id: 'rec-1' }),
    }
  };

  const mockPrismaService = {
    tenant: {
      findMany: vi.fn().mockResolvedValue([{ id: 'tenant-1' }]),
    },
    getTenantClient: vi.fn().mockReturnValue(mockTenantClient),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AutomationEngineService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<AutomationEngineService>(AutomationEngineService);
    prismaService = module.get<PrismaService>(PrismaService);
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
    vi.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    
    // Reset mocks
    vi.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('processAutomationsForTenant', () => {
    it('should process active automations and evaluate rules', async () => {
      // Mock an active automation
      const mockAutomation = {
        id: 'auto-1',
        tenantId: 'tenant-1',
        activa: true,
        evento: AutomationEvent.COTIZACION_SIN_RESPUESTA,
        accion: AutomationAction.CREAR_ACTIVIDAD,
        condiciones: { dias: 3 },
        configuracionAccion: { tipoActividad: 'SEGUIMIENTO' }
      };

      mockTenantClient.automation.findMany.mockResolvedValueOnce([mockAutomation]);
      
      // Mock quote target
      mockTenantClient.quote.findMany.mockResolvedValueOnce([
        { id: 'q-1', clienteId: 'c-1', vendedorId: 'v-1' }
      ]);

      await service.processAutomationsForTenant('tenant-1');

      // Should check if it ran before
      expect(mockTenantClient.automationExecution.findFirst).toHaveBeenCalledWith({
        where: { tenantId: 'tenant-1', automationId: 'auto-1', entidadRef: 'quote:q-1', estado: ExecutionStatus.EXITOSO }
      });

      // Should create activity
      expect(mockTenantClient.activity.create).toHaveBeenCalled();

      // Should record execution
      expect(mockTenantClient.automationExecution.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          automationId: 'auto-1',
          entidadRef: 'quote:q-1',
          estado: ExecutionStatus.EXITOSO
        })
      }));
    });

    it('should skip if already executed (idempotency)', async () => {
      const mockAutomation = {
        id: 'auto-2',
        tenantId: 'tenant-1',
        activa: true,
        evento: AutomationEvent.STOCK_BAJO,
        accion: AutomationAction.GENERAR_ALERTA,
        condiciones: {},
      };

      mockTenantClient.automation.findMany.mockResolvedValueOnce([mockAutomation]);
      
      // Mock product low stock
      mockTenantClient.product.findMany.mockResolvedValueOnce([
        { id: 'p-1', stockMinimo: 10, productStock: { stockFisico: 5, stockReservado: 0 } }
      ]);

      // Mock that it was ALREADY EXECUTED
      mockTenantClient.automationExecution.findFirst.mockResolvedValueOnce({ id: 'exec-old' });

      await service.processAutomationsForTenant('tenant-1');

      // Should NOT create recommendation
      expect(mockTenantClient.recommendation.create).not.toHaveBeenCalled();
      // Should NOT create a new successful execution record
      expect(mockTenantClient.automationExecution.create).not.toHaveBeenCalled();
    });

    it('should handle errors gracefully and record ERROR status', async () => {
      const mockAutomation = {
        id: 'auto-3',
        tenantId: 'tenant-1',
        activa: true,
        evento: AutomationEvent.CLIENTE_INACTIVO,
        accion: AutomationAction.CREAR_ACTIVIDAD, // Will fail if no responsible is provided/found
        condiciones: { dias: 60 },
        configuracionAccion: {}
      };

      mockTenantClient.automation.findMany.mockResolvedValueOnce([mockAutomation]);
      
      // Mock customer
      mockTenantClient.customer.findMany.mockResolvedValueOnce([
        { id: 'c-1', nombreComercial: 'Test' } // No vendedorId
      ]);

      await service.processAutomationsForTenant('tenant-1');

      // Should record execution with ERROR
      expect(mockTenantClient.automationExecution.create).toHaveBeenCalledWith(expect.objectContaining({
        data: expect.objectContaining({
          estado: ExecutionStatus.ERROR
        })
      }));
    });
  });
});
