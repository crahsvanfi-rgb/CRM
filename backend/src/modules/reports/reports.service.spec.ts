import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ReportsService } from './reports.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

describe('ReportsService', () => {
  let service: ReportsService;
  let mockPrismaClient: any;

  beforeEach(async () => {
    mockPrismaClient = {
      order: {
        aggregate: vi.fn(),
        groupBy: vi.fn(),
        findMany: vi.fn(),
      },
      orderItem: {
        groupBy: vi.fn(),
      },
      productStock: {
        findMany: vi.fn(),
      }
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ReportsService,
        {
          provide: PrismaService,
          useValue: {
            getTenantClient: vi.fn().mockReturnValue(mockPrismaClient)
          }
        }
      ],
    }).compile();

    service = module.get<ReportsService>(ReportsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getSalesByPeriod', () => {
    it('should aggregate sales in a period', async () => {
      mockPrismaClient.order.aggregate.mockResolvedValue({
        _sum: { total: 1500 },
        _count: { id: 5 }
      });

      const res = await service.getSalesByPeriod('t1', { fechaInicio: '2023-01-01', fechaFin: '2023-12-31' });
      
      expect(mockPrismaClient.order.aggregate).toHaveBeenCalled();
      expect(res.totalVentas).toBe(1500);
      expect(res.cantidadPedidos).toBe(5);
    });
  });

  describe('getStockSummary', () => {
    it('should map stock data and compute available stock', async () => {
      mockPrismaClient.productStock.findMany.mockResolvedValue([
        {
          productId: 'p1',
          stockFisico: 100,
          stockReservado: 20,
          stockTransito: 0,
          product: { sku: 'SKU1', nombre: 'Prod 1', stockMinimo: 10 }
        }
      ]);

      const res = await service.getStockSummary('t1');
      expect(res.length).toBe(1);
      expect(res[0].stockDisponible).toBe(80);
      expect(res[0].alerta).toBe(false);
    });
  });
});
