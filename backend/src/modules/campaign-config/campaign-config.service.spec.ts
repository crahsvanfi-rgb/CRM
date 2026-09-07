import { describe, it, expect, beforeEach, vi } from 'vitest';
import { CampaignConfigService } from './campaign-config.service.js';

describe('CampaignConfigService', () => {
  let service: CampaignConfigService;
  let mockPrisma: any;
  let mockTenantClient: any;

  beforeEach(() => {
    mockTenantClient = {
      campaignConfig: {
        findUnique: vi.fn(),
        upsert: vi.fn(),
        update: vi.fn(),
        create: vi.fn()
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({})
      }
    };

    mockPrisma = {
      getTenantClient: vi.fn().mockReturnValue(mockTenantClient)
    };

    service = new CampaignConfigService(mockPrisma);
  });

  it('getConfig: debe devolver la configuración existente del tenant', async () => {
    const fakeConfig = {
      id: 'cfg-1',
      tenantId: 'tenant-1',
      campanasActivas: true,
      limiteMensajesPorDia: 1000
    };
    mockTenantClient.campaignConfig.findUnique.mockResolvedValue(fakeConfig);

    const res = await service.getConfig('tenant-1');
    expect(res).toEqual(fakeConfig);
    expect(mockTenantClient.campaignConfig.findUnique).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1' }
    });
  });

  it('getConfig: si no existe, debe crear o retornar valores por defecto', async () => {
    mockTenantClient.campaignConfig.findUnique.mockResolvedValue(null);
    const createdConfig = {
      id: 'cfg-def',
      tenantId: 'tenant-1',
      campanasActivas: true,
      aprobacionObligatoria: true,
      limiteMensajesPorDia: 1000
    };
    mockTenantClient.campaignConfig.create.mockResolvedValue(createdConfig);

    const res = await service.getConfig('tenant-1');
    expect(res).toEqual(createdConfig);
  });

  it('upsertConfig: debe validar y actualizar configuración y registrar auditoría', async () => {
    const dto = {
      campanasActivas: true,
      aprobacionObligatoria: false,
      limiteMensajesPorDia: 500,
      limiteMensajesPorHora: 50,
      horarioPermitidoInicio: '08:00',
      horarioPermitidoFin: '20:00',
      costoPorMensajeWhatsapp: 0.04,
      costoPorMensajeSms: 0.015,
      mensajePredeterminado: 'Hola',
      firma: 'Att. Ventas'
    };

    const savedConfig = { id: 'cfg-1', tenantId: 'tenant-1', ...dto };
    mockTenantClient.campaignConfig.upsert.mockResolvedValue(savedConfig);

    const res = await service.upsertConfig('tenant-1', 'user-1', 'admin', dto);
    expect(res).toEqual(savedConfig);
    expect(mockTenantClient.auditLog.create).toHaveBeenCalled();
  });

  it('toggleCampanas: debe alternar el estado de campanasActivas', async () => {
    mockTenantClient.campaignConfig.findUnique.mockResolvedValue({
      id: 'cfg-1',
      tenantId: 'tenant-1',
      campanasActivas: true
    });
    mockTenantClient.campaignConfig.update.mockResolvedValue({
      id: 'cfg-1',
      tenantId: 'tenant-1',
      campanasActivas: false
    });

    const res = await service.toggleCampanas('tenant-1', 'user-1', 'admin');
    expect(res.campanasActivas).toBe(false);
    expect(mockTenantClient.campaignConfig.update).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1' },
      data: { campanasActivas: false }
    });
  });
});
