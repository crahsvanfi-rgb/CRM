import { Test, TestingModule } from '@nestjs/testing';
import { QuotesService } from './quotes.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { QuoteStatus } from '@prisma/client';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { vi, describe, beforeEach, it, expect } from 'vitest';

describe('QuotesService', () => {
  let service: QuotesService;
  let prisma: PrismaService;

  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';
  const mockClienteId = 'client-123';
  const mockProductId = 'prod-123';

  const mockTx = {
    quote: {
      create: vi.fn(),
      update: vi.fn(),
      findFirst: vi.fn(),
    },
    quoteItem: {
      deleteMany: vi.fn(),
    },
    order: {
      findFirst: vi.fn(),
      create: vi.fn(),
    }
  };

  const mockTenantClient = {
    customer: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    product: { findMany: vi.fn() },
    quote: {
      findUnique: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    quoteItem: { deleteMany: vi.fn() },
    $transaction: vi.fn(async (cb: any) => cb(mockTx)),
  };

  const mockPrismaService = {
    getTenantClient: vi.fn().mockReturnValue(mockTenantClient),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QuotesService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<QuotesService>(QuotesService);
    prisma = module.get<PrismaService>(PrismaService);
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('debe crear una cotización calculando totales', async () => {
      mockTenantClient.customer.findUnique.mockResolvedValue({ id: mockClienteId });
      mockTenantClient.user.findUnique.mockResolvedValue({ id: mockUserId });
      mockTenantClient.product.findMany.mockResolvedValue([{ id: mockProductId }]);
      
      mockTx.quote.findFirst.mockResolvedValue(null);
      mockTx.quote.create.mockResolvedValue({ id: 'quote-1', total: 90 });

      const dto = {
        clienteId: mockClienteId,
        vendedorId: mockUserId,
        items: [
          { productId: mockProductId, cantidad: 2, precioUnitario: 50, descuento: 10 }
        ]
      };

      const result = await service.create(mockTenantId, dto);
      
      expect(result.id).toBe('quote-1');
      expect(mockTx.quote.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          numero: 'COT-0001',
          subtotal: 90, // 2*50 - 10
          total: 90,
          estado: QuoteStatus.BORRADOR
        }),
        include: { items: true }
      });
    });

    it('debe fallar si falta cliente o vendedor', async () => {
      mockTenantClient.customer.findUnique.mockResolvedValue(null);
      mockTenantClient.user.findUnique.mockResolvedValue({ id: mockUserId });

      const dto = {
        clienteId: mockClienteId,
        vendedorId: mockUserId,
        items: []
      };

      await expect(service.create(mockTenantId, dto)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    it('debe fallar si la cotizacion esta aceptada', async () => {
      mockTenantClient.quote.findUnique.mockResolvedValue({
        id: 'quote-1',
        estado: QuoteStatus.ACEPTADA
      });

      await expect(service.update(mockTenantId, 'quote-1', {})).rejects.toThrow(BadRequestException);
    });
  });

  describe('convertToOrder', () => {
    it('debe crear un pedido copiando la info', async () => {
      mockTenantClient.quote.findUnique.mockResolvedValue({
        id: 'quote-1',
        clienteId: mockClienteId,
        vendedorId: mockUserId,
        total: 100,
        estado: QuoteStatus.ENVIADA,
        items: [{ productId: mockProductId, cantidad: 1, precioUnitario: 100, descuento: 0, total: 100 }]
      });

      mockTx.order.findFirst.mockResolvedValue(null);
      mockTx.order.create.mockResolvedValue({ id: 'order-1' });

      await service.convertToOrder(mockTenantId, 'quote-1');

      expect(mockTx.quote.update).toHaveBeenCalledWith({
        where: { id: 'quote-1' },
        data: { estado: QuoteStatus.ACEPTADA }
      });

      expect(mockTx.order.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          numero: 'PED-0001',
          quoteId: 'quote-1',
          total: 100
        })
      });
    });
  });
});
