import { Test, TestingModule } from '@nestjs/testing';
import { ImportationsService } from './importations.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { ImportationStatus, MovementType } from '@prisma/client';
import { BadRequestException } from '@nestjs/common';

describe('ImportationsService', () => {
  let service: ImportationsService;
  let prisma: PrismaService;
  let inventory: InventoryService;

  const mockTenantId = 'test-tenant';
  const mockUserId = 'user-123';

  const mockPrisma = {
    getTenantClient: vi.fn().mockReturnValue({
      supplier: { findUnique: vi.fn() },
      product: { findMany: vi.fn() },
      importation: {
        findUnique: vi.fn(),
        update: vi.fn(),
      },
    }),
    $transaction: vi.fn((cb) => cb(mockPrisma.getTenantClient())),
  };

  const mockInventory = {
    createMovement: vi.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ImportationsService,
        { provide: PrismaService, useValue: mockPrisma },
        { provide: InventoryService, useValue: mockInventory },
      ],
    }).compile();

    service = module.get<ImportationsService>(ImportationsService);
    prisma = module.get<PrismaService>(PrismaService);
    inventory = module.get<InventoryService>(InventoryService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('transitionState', () => {
    it('should throw error if transitioning backward', async () => {
      mockPrisma.getTenantClient().importation.findUnique.mockResolvedValue({
        id: '1',
        estado: ImportationStatus.EMBARCADA,
      });

      await expect(service.transitionState(mockTenantId, '1', ImportationStatus.PLANIFICADA))
        .rejects
        .toThrow(BadRequestException);
    });
  });

  describe('receive', () => {
    it('should throw error if not in ADUANA', async () => {
      mockPrisma.getTenantClient().importation.findUnique.mockResolvedValue({
        id: '1',
        estado: ImportationStatus.PLANIFICADA,
      });

      await expect(service.receive(mockTenantId, mockUserId, '1'))
        .rejects
        .toThrow(BadRequestException);
    });

    it('should create inventory movements for each item', async () => {
      mockPrisma.getTenantClient().importation.findUnique.mockResolvedValue({
        id: '1',
        estado: ImportationStatus.ADUANA,
        codigo: 'IMP-0001',
        items: [
          { productId: 'p1', cantidad: 10 },
          { productId: 'p2', cantidad: 20 },
        ]
      });

      mockPrisma.getTenantClient().importation.update.mockResolvedValue({ id: '1', estado: ImportationStatus.RECIBIDA });

      await service.receive(mockTenantId, mockUserId, '1');

      expect(mockInventory.createMovement).toHaveBeenCalledTimes(2);
      expect(mockInventory.createMovement).toHaveBeenCalledWith(mockTenantId, mockUserId, expect.objectContaining({
        productId: 'p1',
        tipo: MovementType.ENTRADA_IMPORTACION,
        cantidad: 10,
      }), expect.anything());

      expect(mockInventory.createMovement).toHaveBeenCalledWith(mockTenantId, mockUserId, expect.objectContaining({
        productId: 'p2',
        tipo: MovementType.ENTRADA_IMPORTACION,
        cantidad: 20,
      }), expect.anything());
    });
  });
});
