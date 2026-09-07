import { Test, TestingModule } from '@nestjs/testing';
import { CustomersService } from './customers.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { ConflictException } from '@nestjs/common';

describe('CustomersService', () => {
  let service: CustomersService;
  let prisma: PrismaService;

  const mockTenantClient = {
    customer: {
      findFirst: vi.fn(),
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
      count: vi.fn().mockResolvedValue(0),
      findMany: vi.fn().mockResolvedValue([]),
    },
  };

  const mockPrismaService = {
    getTenantClient: vi.fn().mockReturnValue(mockTenantClient),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomersService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<CustomersService>(CustomersService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('debe crear un cliente exitosamente si el NIT no existe', async () => {
      const tenantId = 'tenant-uuid';
      const dto = { nombreComercial: 'Empresa S.A.', nitCi: '123456789' };
      
      mockTenantClient.customer.findFirst.mockResolvedValueOnce(null); // NIT no existe
      mockTenantClient.customer.create.mockResolvedValueOnce({ id: 'uuid', ...dto });

      const result = await service.create(dto, tenantId);

      expect(mockTenantClient.customer.findFirst).toHaveBeenCalledWith({
        where: { nitCi: '123456789' }
      });
      expect(mockTenantClient.customer.create).toHaveBeenCalled();
      expect(result.nombreComercial).toBe('Empresa S.A.');
    });

    it('debe lanzar ConflictException si el NIT ya existe', async () => {
      const tenantId = 'tenant-uuid';
      const dto = { nombreComercial: 'Empresa S.A.', nitCi: '123456789' };
      
      mockTenantClient.customer.findFirst.mockResolvedValueOnce({ id: 'existing-uuid' }); // NIT ya existe

      await expect(service.create(dto, tenantId)).rejects.toThrow(ConflictException);
    });
  });

  describe('findOne con resumen', () => {
    it('debe retornar el cliente con cálculos de resumen (pedidos y cotizaciones)', async () => {
      const tenantId = 'tenant-uuid';
      mockTenantClient.customer.findUnique.mockResolvedValueOnce({
        id: 'cust-uuid',
        nombreComercial: 'Empresa',
        orders: [
          { id: '1', total: 100, createdAt: new Date('2026-01-01') },
          { id: '2', total: 200, createdAt: new Date('2026-01-02') }
        ],
        quotes: [
          { id: '1', status: 'DRAFT' },
          { id: '2', status: 'ACCEPTED' }
        ],
        activities: [],
        notes: []
      });

      const result = await service.findOne('cust-uuid', tenantId);

      expect(result.resumen.totalComprado).toBe(300);
      expect(result.resumen.cantidadPedidos).toBe(2);
      expect(result.resumen.cotizacionesAbiertas).toBe(1); // Solo 1 en DRAFT
      expect(result.resumen.ultimaCompra).toEqual(new Date('2026-01-01')); // Por el mock array orden
    });
  });
});
