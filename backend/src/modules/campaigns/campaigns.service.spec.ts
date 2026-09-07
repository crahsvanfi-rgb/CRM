import { Test, TestingModule } from '@nestjs/testing';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CampaignsService } from './campaigns.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { SegmentsService } from '../segments/segments.service.js';
import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { Priority, CampaignType, CampaignTrigger } from '@prisma/client';

describe('CampaignsService - Bloque 4.15 a 4.20', () => {
  let service: CampaignsService;
  let mockPrismaService: any;
  let mockTenantClient: any;

  const TENANT_ID = '00000000-0000-0000-0000-000000000001';
  const USER_ID = 'user-uuid-1';
  const VENDOR_ID = 'vendor-uuid-2';

  beforeEach(async () => {
    mockTenantClient = {
      customer: {
        findMany: vi.fn(),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
      },
      product: {
        findUnique: vi.fn(),
      },
      orderItem: {
        findMany: vi.fn(),
      },
      user: {
        findUnique: vi.fn(),
      },
      segment: {
        create: vi.fn().mockImplementation((args: any) => Promise.resolve({ id: 'segment-1', ...args.data })),
      },
      campaign: {
        create: vi.fn().mockImplementation((args: any) => Promise.resolve({ id: 'campaign-1', ...args.data })),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn(),
        update: vi.fn().mockImplementation((args: any) => Promise.resolve({ id: args.where.id, ...args.data })),
      },
      campaignRecipient: {
        createMany: vi.fn().mockResolvedValue({ count: 2 }),
        create: vi.fn().mockImplementation((args: any) => Promise.resolve({ id: 'rec-1', ...args.data })),
        findUnique: vi.fn(),
        findFirst: vi.fn(),
        update: vi.fn().mockImplementation((args: any) => Promise.resolve({ id: args.where.id, ...args.data })),
      },
      campaignMessage: {
        findFirst: vi.fn(),
        update: vi.fn(),
        create: vi.fn(),
      },
      activity: {
        create: vi.fn().mockImplementation((args: any) => Promise.resolve({ id: 'activity-1', ...args.data })),
      },
      lead: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
        create: vi.fn().mockImplementation((args: any) => Promise.resolve({ id: 'lead-1', ...args.data })),
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({ id: 'audit-1' }),
      },
      aIConfiguration: {
        findUnique: vi.fn().mockResolvedValue(null),
      },
      aIUsage: {
        create: vi.fn().mockResolvedValue({ id: 'usage-1' }),
      },
      $transaction: vi.fn().mockImplementation(async (callback: any) => {
        return callback(mockTenantClient);
      }),
    };

    mockPrismaService = {
      getTenantClient: vi.fn().mockReturnValue(mockTenantClient),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CampaignsService,
        { provide: PrismaService, useValue: mockPrismaService },
        { provide: SegmentsService, useValue: {} },
      ],
    }).compile();

    service = module.get<CampaignsService>(CampaignsService);
  });

  describe('4.17 Recuperación de clientes inactivos con priorización', () => {
    it('debe identificar clientes inactivos y crear segmento, campaña y destinatarios con prioridad heurística', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 100);

      mockTenantClient.customer.findMany.mockResolvedValue([
        {
          id: 'cust-1',
          nombreComercial: 'Cliente Grande Inactivo',
          orders: [
            { id: 'o-1', total: 6000, fecha: pastDate, estado: 'ENTREGADO' },
            { id: 'o-2', total: 1000, fecha: pastDate, estado: 'ENTREGADO' },
          ],
        },
        {
          id: 'cust-2',
          nombreComercial: 'Cliente Pequeño Inactivo',
          orders: [{ id: 'o-3', total: 200, fecha: pastDate, estado: 'ENTREGADO' }],
        },
      ]);

      const result = await service.createAutoRecoveryCampaign(TENANT_ID, USER_ID, 'admin', {
        diasInactivo: 90,
        priorizarConIA: false,
      });

      expect(mockTenantClient.segment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tipoSegmento: 'CLIENTES',
          }),
        })
      );

      expect(mockTenantClient.campaign.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tipo: CampaignType.AUTOMATICA_RECUPERACION,
            eventoDisparador: CampaignTrigger.CLIENTE_INACTIVO,
            totalDestinatarios: 2,
          }),
        })
      );

      expect(mockTenantClient.campaignRecipient.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ clienteId: 'cust-1', prioridad: Priority.ALTA }),
            expect.objectContaining({ clienteId: 'cust-2', prioridad: Priority.BAJA }),
          ]),
        })
      );

      expect(result.totalDestinatarios).toBe(2);
    });

    it('debe priorizar con IA si priorizarConIA=true y existe configuración OpenRouter', async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 120);

      mockTenantClient.customer.findMany.mockResolvedValue([
        {
          id: 'cust-ai',
          nombreComercial: 'Cliente AI Test',
          orders: [{ id: 'o-1', total: 3000, fecha: pastDate, estado: 'ENTREGADO' }],
        },
      ]);

      mockTenantClient.aIConfiguration.findUnique.mockResolvedValue({
        apiKey: 'test-key',
        defaultModel: 'openai/gpt-4o-mini',
      });

      // Mock global fetch para OpenRouter
      const originalFetch = global.fetch;
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: JSON.stringify({
                  clasificaciones: [{ id: 'cust-ai', prioridad: 'ALTA' }],
                }),
              },
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 10, total_tokens: 20 },
        }),
      } as any);

      const result = await service.createAutoRecoveryCampaign(TENANT_ID, USER_ID, 'admin', {
        diasInactivo: 90,
        priorizarConIA: true,
      });

      expect(mockTenantClient.campaignRecipient.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ clienteId: 'cust-ai', prioridad: Priority.ALTA }),
          ]),
        })
      );

      global.fetch = originalFetch;
    });
  });

  describe('4.18 Campañas por productos', () => {
    it('debe buscar compradores del producto en pedidos ENTREGADO y crear campaña', async () => {
      const prodId = 'prod-100';
      mockTenantClient.product.findUnique.mockResolvedValue({
        id: prodId,
        nombre: 'Cámara Termográfica Industrial',
      });

      mockTenantClient.orderItem.findMany.mockResolvedValue([
        { order: { clienteId: 'cust-1' } },
        { order: { clienteId: 'cust-2' } },
        { order: { clienteId: 'cust-1' } }, // Duplicado que debe ser filtrado
      ]);

      const result = await service.createAutoProductCampaign(TENANT_ID, USER_ID, 'admin', {
        productoId: prodId,
      });

      expect(mockTenantClient.campaign.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tipo: CampaignType.AUTOMATICA_PRODUCTO,
            eventoDisparador: CampaignTrigger.NUEVO_PRODUCTO,
            productoId: prodId,
            totalDestinatarios: 2,
          }),
        })
      );

      expect(mockTenantClient.campaignRecipient.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.arrayContaining([
            expect.objectContaining({ clienteId: 'cust-1', productoInteresId: prodId }),
            expect.objectContaining({ clienteId: 'cust-2', productoInteresId: prodId }),
          ]),
        })
      );

      expect(result.totalDestinatarios).toBe(2);
    });

    it('debe lanzar NotFoundException si el producto no existe', async () => {
      mockTenantClient.product.findUnique.mockResolvedValue(null);

      await expect(
        service.createAutoProductCampaign(TENANT_ID, USER_ID, 'admin', { productoId: 'no-prod' })
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('4.19 Campañas por vendedor (RBAC)', () => {
    it('un vendedor solo puede crear campañas para sí mismo', async () => {
      await expect(
        service.createAutoVendorCampaign(TENANT_ID, USER_ID, 'Vendedor', {
          vendedorId: VENDOR_ID, // Diferente a USER_ID
        })
      ).rejects.toThrow(ForbiddenException);
    });

    it('un admin puede crear campañas para cualquier vendedor', async () => {
      mockTenantClient.user.findUnique.mockResolvedValue({
        id: VENDOR_ID,
        name: 'Carlos Vendedor',
      });

      mockTenantClient.customer.findMany.mockResolvedValue([
        { id: 'c-1', nombreComercial: 'Cliente Cartera 1' },
      ]);

      const result = await service.createAutoVendorCampaign(TENANT_ID, USER_ID, 'Admin', {
        vendedorId: VENDOR_ID,
      });

      expect(mockTenantClient.campaign.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tipo: CampaignType.AUTOMATICA_VENDEDOR,
            vendedorObjetivoId: VENDOR_ID,
            totalDestinatarios: 1,
          }),
        })
      );

      expect(result.totalDestinatarios).toBe(1);
    });
  });

  describe('4.15 & Conversión de respuestas (processResponse)', () => {
    it('si el contacto es Cliente existente: debe crear Actividad de seguimiento y vincularlo', async () => {
      const recipientId = 'rec-cust-1';
      const campaignId = 'camp-1';

      mockTenantClient.campaignRecipient.findUnique.mockResolvedValue({
        id: recipientId,
        clienteId: 'customer-123',
        leadId: null,
        cliente: { id: 'customer-123', telefono: '+59170000001', vendedorId: VENDOR_ID },
        campaign: { id: campaignId, nombre: 'Campaña Test', responsableId: USER_ID },
      });

      mockTenantClient.customer.findUnique.mockResolvedValue({
        id: 'customer-123',
        vendedorId: VENDOR_ID,
      });

      mockTenantClient.campaignMessage.findFirst.mockResolvedValue({
        id: 'msg-1',
        estado: 'PENDIENTE',
      });

      const res = await service.processResponse(
        TENANT_ID,
        campaignId,
        recipientId,
        'Deseo información de compra'
      );

      expect(res.success).toBe(true);
      expect(res.resultType).toBe('CUSTOMER_ACTIVITY_CREATED');

      expect(mockTenantClient.activity.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            tipo: 'SEGUIMIENTO',
            clienteId: 'customer-123',
            responsableId: VENDOR_ID,
          }),
        })
      );

      expect(mockTenantClient.campaignRecipient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: recipientId },
          data: expect.objectContaining({
            clienteVinculadoId: 'customer-123',
            actividadGeneradaId: 'activity-1',
          }),
        })
      );

      expect(mockTenantClient.campaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: campaignId },
          data: expect.objectContaining({
            totalClientesVinculados: { increment: 1 },
            totalActividadesGeneradas: { increment: 1 },
          }),
        })
      );
    });

    it('si el contacto NO es Cliente: debe crear un Lead automáticamente y actualizar métricas', async () => {
      const recipientId = 'rec-lead-1';
      const campaignId = 'camp-1';

      mockTenantClient.campaignRecipient.findUnique.mockResolvedValue({
        id: recipientId,
        clienteId: null,
        leadId: null,
        cliente: null,
        lead: { id: 'l-old', phone: '+59171111111', name: 'Interesado Web' },
        campaign: { id: campaignId, nombre: 'Campaña Lanzamiento', responsableId: USER_ID },
      });

      mockTenantClient.customer.findFirst.mockResolvedValue(null);
      mockTenantClient.lead.findFirst.mockResolvedValue(null);
      mockTenantClient.campaignMessage.findFirst.mockResolvedValue(null);

      const res = await service.processResponse(
        TENANT_ID,
        campaignId,
        recipientId,
        'Hola quiero comprar'
      );

      expect(res.success).toBe(true);
      expect(res.resultType).toBe('LEAD_CREATED_OR_LINKED');

      expect(mockTenantClient.lead.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            phone: '+59171111111',
            estado: 'NUEVO',
            vendedorId: USER_ID,
          }),
        })
      );

      expect(mockTenantClient.campaignRecipient.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: recipientId },
          data: expect.objectContaining({
            leadGeneradoId: 'lead-1',
          }),
        })
      );

      expect(mockTenantClient.campaign.update).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: campaignId },
          data: expect.objectContaining({
            totalLeads: { increment: 1 },
            totalLeadsGenerados: { increment: 1 },
          }),
        })
      );
    });
  });

  describe('4.20 Bandeja de campañas (getBoard)', () => {
    it('debe listar campañas con métricas, paginación y respetar RBAC para Vendedor', async () => {
      mockTenantClient.campaign.findMany.mockResolvedValue([
        { id: 'c-1', nombre: 'Campaña 1', totalDestinatarios: 10, totalRespuestas: 2, totalLeads: 1 },
      ]);
      mockTenantClient.campaign.count.mockResolvedValue(1);

      const result = await service.getBoard(
        TENANT_ID,
        { name: 'Vendedor' },
        USER_ID,
        { page: 1, limit: 10, estado: 'PROGRAMADA' }
      );

      expect(mockTenantClient.campaign.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            tenantId: TENANT_ID,
            estado: 'PROGRAMADA',
            OR: [{ responsableId: USER_ID }, { vendedorObjetivoId: USER_ID }],
          }),
        })
      );

      expect(result.data.length).toBe(1);
      expect(result.meta.total).toBe(1);
    });
  });
});
