import { Test, TestingModule } from '@nestjs/testing';
import { InventoryService } from './inventory.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { MovementType } from '@prisma/client';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { vi, describe, beforeEach, it, expect } from 'vitest';

describe('InventoryService', () => {
  let service: InventoryService;
  let prisma: PrismaService;
  
  const mockTenantId = 'tenant-123';
  const mockUserId = 'user-123';
  const mockProductId = 'prod-123';

  // Creamos mocks para los métodos de Prisma
  const mockTx = {
    productStock: {
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    inventoryMovement: {
      create: vi.fn(),
    }
  };

  const mockTenantClient = {
    product: {
      findUnique: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    inventoryMovement: {
      findFirst: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
    },
    $transaction: vi.fn(async (cb: any) => cb(mockTx)),
  };

  const mockPrismaService = {
    getTenantClient: vi.fn().mockReturnValue(mockTenantClient),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        InventoryService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<InventoryService>(InventoryService);
    prisma = module.get<PrismaService>(PrismaService);

    // Resetear todos los mocks
    vi.clearAllMocks();
  });

  describe('createMovement', () => {
    it('debe arrojar NotFoundException si el producto no existe', async () => {
      mockTenantClient.product.findUnique.mockResolvedValue(null);

      await expect(
        service.createMovement(mockTenantId, mockUserId, {
          productId: mockProductId,
          tipo: MovementType.ENTRADA_IMPORTACION,
          cantidad: 10,
        })
      ).rejects.toThrow(NotFoundException);
    });

    it('debe crear un movimiento de entrada y actualizar el stock correctamente', async () => {
      mockTenantClient.product.findUnique.mockResolvedValue({ id: mockProductId });
      // Simulamos que ya hay un stock
      mockTx.productStock.findUnique.mockResolvedValue({
        id: 'stock-1',
        stockFisico: 5,
        stockReservado: 0,
        stockTransito: 0
      });
      mockTx.inventoryMovement.create.mockResolvedValue({ id: 'mov-1' });

      await service.createMovement(mockTenantId, mockUserId, {
        productId: mockProductId,
        tipo: MovementType.ENTRADA_IMPORTACION,
        cantidad: 10,
      });

      expect(mockTx.productStock.update).toHaveBeenCalledWith({
        where: { id: 'stock-1' },
        data: {
          stockFisico: 15,
          stockReservado: 0,
          stockTransito: 0
        }
      });
      
      expect(mockTx.inventoryMovement.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          stockAnterior: 5,
          stockPosterior: 15,
        })
      });
    });

    it('debe arrojar BadRequestException si un movimiento resulta en stock negativo', async () => {
      mockTenantClient.product.findUnique.mockResolvedValue({ id: mockProductId });
      mockTx.productStock.findUnique.mockResolvedValue({
        id: 'stock-1',
        stockFisico: 5,
        stockReservado: 0,
        stockTransito: 0
      });

      await expect(
        service.createMovement(mockTenantId, mockUserId, {
          productId: mockProductId,
          tipo: MovementType.SALIDA_VENTA,
          cantidad: 10, // Intenta sacar más de lo que hay
        })
      ).rejects.toThrow(BadRequestException);
    });

    it('debe arrojar BadRequestException al reservar más de lo disponible', async () => {
      mockTenantClient.product.findUnique.mockResolvedValue({ id: mockProductId });
      mockTx.productStock.findUnique.mockResolvedValue({
        id: 'stock-1',
        stockFisico: 10,
        stockReservado: 5, // Quedan 5 disponibles
        stockTransito: 0
      });

      await expect(
        service.createMovement(mockTenantId, mockUserId, {
          productId: mockProductId,
          tipo: MovementType.RESERVA,
          cantidad: 10, // Intenta reservar 10, pero solo hay 5
        })
      ).rejects.toThrow(BadRequestException);
    });
  });
});
