import { Test, TestingModule } from '@nestjs/testing';
import { LeadsService } from './leads.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { LeadStatus } from './dto/create-lead.dto.js';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { LeadTouchpointCanal, LeadStage } from '@prisma/client';

describe('LeadsService', () => {
  let service: LeadsService;
  let prisma: PrismaService;

  const mockTenantClient = {
    lead: {
      count: vi.fn().mockResolvedValue(0),
      create: vi.fn().mockImplementation((args: any) => Promise.resolve({ id: 'uuid', ...args.data })),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    leadTouchpoint: {
      create: vi.fn().mockImplementation((args: any) => Promise.resolve({ id: 'tp-1', ...args.data })),
      findMany: vi.fn().mockResolvedValue([]),
      findFirst: vi.fn(),
      update: vi.fn().mockImplementation((args: any) => Promise.resolve({ id: args.where.id, ...args.data })),
      delete: vi.fn().mockResolvedValue({ id: 'tp-1' }),
    },
    customer: {
      create: vi.fn(),
    },
    leadActivity: {
      create: vi.fn(),
    },
    $transaction: vi.fn().mockImplementation((cb: any) => cb(mockTenantClient)),
  };

  const mockPrismaService = {
    getTenantClient: vi.fn().mockReturnValue(mockTenantClient),
    user: {
      findUnique: vi.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LeadsService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<LeadsService>(LeadsService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('create', () => {
    it('debe crear un lead y autogenerar el código LEAD-001 con campos en inglés', async () => {
      const tenantId = 'tenant-uuid';
      const dto = { name: 'Juan Perez' };

      const result = await service.create(dto, tenantId);

      expect(mockTenantClient.lead.count).toHaveBeenCalled();
      expect(mockTenantClient.lead.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Juan Perez',
          leadId: 'LEAD-001',
          estado: LeadStatus.NUEVO,
        }),
      });
      expect(result.leadId).toBe('LEAD-001');
    });

    it('debe normalizar campos en español como nombre, empresa, telefono, ciudad, fuente', async () => {
      const tenantId = 'tenant-uuid';
      const dto = {
        nombre: 'Carlos Mendoza',
        empresa: 'Importadora Sol SRL',
        telefono: '+59170012345',
        ciudad: 'Santa Cruz',
        fuente: 'WHATSAPP_ZERNIO',
        productoInteres: 'Inversores',
        observaciones: 'Interesado en lista de precios mayorista',
      };

      const result = await service.create(dto, tenantId);

      expect(mockTenantClient.lead.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'Carlos Mendoza',
          companyName: 'Importadora Sol SRL',
          phone: '+59170012345',
          ciudad: 'Santa Cruz',
          fuente: 'WHATSAPP_ZERNIO',
          productoInteres: 'Inversores',
          observaciones: 'Interesado en lista de precios mayorista',
          estado: LeadStatus.NUEVO,
        }),
      });
      expect(result.name).toBe('Carlos Mendoza');
    });

    it('debe arrojar error si no se envía nombre ni name', async () => {
      await expect(service.create({}, 'tenant-uuid')).rejects.toThrow(BadRequestException);
    });
  });

  describe('touchpoints', () => {
    const leadId = 'lead-uuid';
    const tenantId = 'tenant-uuid';

    beforeEach(() => {
      mockTenantClient.lead.findFirst.mockResolvedValue({ id: leadId, tenantId, activo: true });
    });

    it('debe crear un touchpoint correctamente para el lead', async () => {
      const dto = {
        canal: LeadTouchpointCanal.WHATSAPP,
        resumen: 'Se presentó cotización formal por WhatsApp',
        objeciones: 'Precio algo elevado respecto a la competencia',
        puntosInteres: 'Garantía extendida de 2 años',
        etapa: LeadStage.COTIZACION_ENVIADA,
      };

      const result = await service.createTouchpoint(leadId, dto, tenantId);

      expect(mockTenantClient.leadTouchpoint.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          leadId,
          canal: LeadTouchpointCanal.WHATSAPP,
          resumen: 'Se presentó cotización formal por WhatsApp',
          objeciones: 'Precio algo elevado respecto a la competencia',
          puntosInteres: 'Garantía extendida de 2 años',
          etapa: LeadStage.COTIZACION_ENVIADA,
        }),
      });
      expect(result.id).toBe('tp-1');
    });

    it('debe listar los touchpoints ordenados por fecha descendente', async () => {
      mockTenantClient.leadTouchpoint.findMany.mockResolvedValueOnce([
        { id: 'tp-2', canal: 'LLAMADA' },
        { id: 'tp-1', canal: 'WHATSAPP' },
      ]);

      const result = await service.findTouchpoints(leadId, tenantId);
      expect(mockTenantClient.leadTouchpoint.findMany).toHaveBeenCalledWith({
        where: { leadId, tenantId },
        orderBy: { fecha: 'desc' },
      });
      expect(result.length).toBe(2);
    });

    it('debe actualizar un touchpoint existente', async () => {
      mockTenantClient.leadTouchpoint.findFirst.mockResolvedValueOnce({
        id: 'tp-1',
        leadId,
        tenantId,
      });

      const updateDto = {
        resumen: 'Actualizado: cliente confirmó recepción de catálogo',
        materialAbierto: true,
      };

      const result = await service.updateTouchpoint(leadId, 'tp-1', updateDto, tenantId);
      expect(mockTenantClient.leadTouchpoint.update).toHaveBeenCalledWith({
        where: { id: 'tp-1' },
        data: expect.objectContaining({
          resumen: 'Actualizado: cliente confirmó recepción de catálogo',
          materialAbierto: true,
        }),
      });
      expect(result.materialAbierto).toBe(true);
    });

    it('debe eliminar un touchpoint existente', async () => {
      mockTenantClient.leadTouchpoint.findFirst.mockResolvedValueOnce({
        id: 'tp-1',
        leadId,
        tenantId,
      });

      const result = await service.removeTouchpoint(leadId, 'tp-1', tenantId);
      expect(mockTenantClient.leadTouchpoint.delete).toHaveBeenCalledWith({
        where: { id: 'tp-1' },
      });
      expect(result.id).toBe('tp-1');
    });
  });

  describe('convertToCustomer', () => {
    it('debe lanzar error si el lead ya está convertido (estado GANADO)', async () => {
      const tenantId = 'tenant-uuid';
      const leadId = 'lead-uuid';
      mockTenantClient.lead.findFirst.mockResolvedValueOnce({
        id: leadId,
        estado: LeadStatus.GANADO,
      });

      await expect(service.convertToCustomer(leadId, tenantId)).rejects.toThrow(BadRequestException);
    });

    it('debe actualizar el estado a GANADO y crear el cliente en una transacción', async () => {
      const tenantId = 'tenant-uuid';
      const leadId = 'lead-uuid';

      mockTenantClient.lead.findFirst.mockResolvedValueOnce({
        id: leadId,
        estado: LeadStatus.NUEVO,
        name: 'Ana Gomez',
        companyName: 'Empresa SA',
      });

      mockTenantClient.lead.update.mockResolvedValueOnce({ id: leadId, estado: LeadStatus.GANADO });
      mockTenantClient.customer.create.mockResolvedValueOnce({ id: 'customer-uuid', name: 'Empresa SA' });

      const result = await service.convertToCustomer(leadId, tenantId);

      expect(mockTenantClient.$transaction).toHaveBeenCalled();
      expect(mockTenantClient.lead.update).toHaveBeenCalledWith({
        where: { id: leadId },
        data: { estado: LeadStatus.GANADO },
      });
      expect(mockTenantClient.customer.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId,
          leadId,
          nombreComercial: 'Empresa SA',
        }),
      });

      expect(result.lead.estado).toBe(LeadStatus.GANADO);
    });
  });
});
