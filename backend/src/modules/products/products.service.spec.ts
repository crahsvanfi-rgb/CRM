import { Test, TestingModule } from '@nestjs/testing';
import { ProductsService } from './products.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ConflictException } from '@nestjs/common';

describe('ProductsService', () => {
  let service: ProductsService;
  
  const mockPrismaClient = {
    product: {
      findUnique: vi.fn(),
      create: vi.fn(),
    },
    category: {
      findUnique: vi.fn(),
    }
  };

  const mockPrismaService = {
    getTenantClient: vi.fn().mockReturnValue(mockPrismaClient),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProductsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<ProductsService>(ProductsService);
    vi.clearAllMocks();
  });

  it('should create a product if SKU is unique', async () => {
    mockPrismaClient.product.findUnique.mockResolvedValueOnce(null);
    mockPrismaClient.product.create.mockResolvedValueOnce({ id: 'prod-1', sku: 'SKU-001' });

    const result = await service.create({
      sku: 'SKU-001',
      nombre: 'Laptop',
      precioVenta: 1000,
    }, 'tenant-1');

    expect(result).toEqual({ id: 'prod-1', sku: 'SKU-001' });
  });

  it('should throw ConflictException if SKU is duplicated', async () => {
    mockPrismaClient.product.findUnique.mockResolvedValueOnce({ id: 'prod-1', sku: 'SKU-001' });

    await expect(service.create({
      sku: 'SKU-001',
      nombre: 'Laptop',
      precioVenta: 1000,
    }, 'tenant-1')).rejects.toThrow(ConflictException);
  });
});
