import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { DashboardService } from './dashboard.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

describe('DashboardService', () => {
  let service: DashboardService;
  let mockPrismaClient: any;

  beforeEach(async () => {
    mockPrismaClient = {
      quote: { count: vi.fn().mockResolvedValue(10) },
      order: { 
        count: vi.fn().mockResolvedValue(5),
        aggregate: vi.fn().mockResolvedValue({ _sum: { total: 5000 } }),
        findMany: vi.fn().mockResolvedValue([{ id: 'o1' }])
      },
      customer: { count: vi.fn().mockResolvedValue(20) },
      productStock: { findMany: vi.fn().mockResolvedValue([
        { stockFisico: 5, stockReservado: 1, product: { stockMinimo: 10 } }
      ]) },
      orderItem: { groupBy: vi.fn().mockResolvedValue([]) },
      product: { findMany: vi.fn().mockResolvedValue([]) },
      importation: { count: vi.fn().mockResolvedValue(2) },
      activity: { count: vi.fn().mockResolvedValue(3) }
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        DashboardService,
        {
          provide: PrismaService,
          useValue: {
            getTenantClient: vi.fn().mockReturnValue(mockPrismaClient)
          }
        }
      ],
    }).compile();

    service = module.get<DashboardService>(DashboardService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should return consolidated metrics', async () => {
    const res = await service.getSummary('tenant1', {});
    
    expect(res).toBeDefined();
    expect(res.ventas.ventasDelMes).toBe(5000);
    expect(res.clientes.nuevosDelMes).toBe(20);
    expect(res.inventario.stockBajo).toBe(1);
    expect(res.importaciones.activas).toBe(2);
    expect(res.seguimientos.actividadesPendientes).toBe(3);
  });
});
