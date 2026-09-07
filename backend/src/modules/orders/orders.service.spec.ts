import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { InventoryService } from '../inventory/inventory.service.js';
import { NotFoundException, BadRequestException } from '@nestjs/common';
import { OrderStatus, MovementType } from '@prisma/client';

describe('OrdersService', () => {
  let service: OrdersService;
  let prisma: PrismaService;
  let inventory: InventoryService;

  const mockTenantId = '11111111-1111-1111-1111-111111111111';
  const mockUserId = 'user-1';
  
  const mockOrder = {
    id: 'order-1',
    numero: 'PED-0001',
    estado: OrderStatus.PENDIENTE,
    items: [
      { productId: 'prod-1', cantidad: 2, precioUnitario: 100 }
    ]
  };

  const mockTenantClient = {
    customer: { findUnique: vi.fn() },
    user: { findUnique: vi.fn() },
    product: { findMany: vi.fn() },
    order: {
      findFirst: vi.fn(),
      create: vi.fn(),
      count: vi.fn(),
      findMany: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn()
    },
    orderItem: { deleteMany: vi.fn() },
    $transaction: vi.fn((cb) => cb(mockTenantClient))
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        {
          provide: PrismaService,
          useValue: { getTenantClient: vi.fn().mockReturnValue(mockTenantClient) }
        },
        {
          provide: InventoryService,
          useValue: {
            reserveStock: vi.fn(),
            releaseStock: vi.fn(),
            createMovement: vi.fn()
          }
        }
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prisma = module.get<PrismaService>(PrismaService);
    inventory = module.get<InventoryService>(InventoryService);
    
    vi.clearAllMocks();
  });

  it('debe confirmar el pedido y reservar stock', async () => {
    mockTenantClient.order.findUnique.mockResolvedValue(mockOrder);
    mockTenantClient.order.update.mockResolvedValue({ ...mockOrder, estado: OrderStatus.CONFIRMADO });

    const result = await service.confirm(mockTenantId, mockUserId, 'order-1');
    
    expect(inventory.reserveStock).toHaveBeenCalledWith(
      mockTenantId,
      mockUserId,
      expect.objectContaining({ productId: 'prod-1', cantidad: 2 }),
      mockTenantClient
    );
    expect(result.estado).toBe(OrderStatus.CONFIRMADO);
  });

  it('debe fallar la confirmación si no está pendiente', async () => {
    mockTenantClient.order.findUnique.mockResolvedValue({ ...mockOrder, estado: OrderStatus.CONFIRMADO });
    await expect(service.confirm(mockTenantId, mockUserId, 'order-1')).rejects.toThrow(BadRequestException);
  });

  it('debe entregar un pedido, liberando reservas y haciendo salida', async () => {
    mockTenantClient.order.findUnique.mockResolvedValue({ ...mockOrder, estado: OrderStatus.CONFIRMADO });
    mockTenantClient.order.update.mockResolvedValue({ ...mockOrder, estado: OrderStatus.ENTREGADO });

    const result = await service.deliver(mockTenantId, mockUserId, 'order-1');
    
    expect(inventory.releaseStock).toHaveBeenCalled();
    expect(inventory.createMovement).toHaveBeenCalledWith(
      mockTenantId,
      mockUserId,
      expect.objectContaining({ tipo: MovementType.SALIDA_VENTA, cantidad: 2 }),
      mockTenantClient
    );
    expect(result.estado).toBe(OrderStatus.ENTREGADO);
  });
});
