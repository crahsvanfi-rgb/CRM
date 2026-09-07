import { describe, it, expect, beforeEach, vi } from 'vitest';
import { OptOutService } from './opt-out.service.js';
import { ContactType, ConsentStatus } from '@prisma/client';

describe('OptOutService', () => {
  let service: OptOutService;
  let mockPrisma: any;
  let mockTenantClient: any;

  beforeEach(() => {
    mockTenantClient = {
      optOut: {
        findFirst: vi.fn(),
        upsert: vi.fn(),
        deleteMany: vi.fn(),
        findMany: vi.fn(),
        count: vi.fn()
      },
      consent: {
        upsert: vi.fn().mockResolvedValue({})
      },
      auditLog: {
        create: vi.fn().mockResolvedValue({})
      }
    };

    mockPrisma = {
      getTenantClient: vi.fn().mockReturnValue(mockTenantClient)
    };

    service = new OptOutService(mockPrisma);
  });

  it('addOptOut: debe agregar contacto a lista de exclusión y registrar consentimiento revocado (NO_CONSENTIDO)', async () => {
    const createdOptOut = {
      id: 'opt-1',
      tenantId: 'tenant-1',
      tipoContacto: ContactType.CUSTOMER,
      contactoId: 'cust-1',
      motivo: 'Solicitó baja'
    };
    mockTenantClient.optOut.upsert.mockResolvedValue(createdOptOut);

    const res = await service.addOptOut('tenant-1', 'user-1', {
      tipoContacto: ContactType.CUSTOMER,
      contactoId: 'cust-1',
      motivo: 'Solicitó baja'
    });

    expect(res).toEqual(createdOptOut);
    expect(mockTenantClient.optOut.upsert).toHaveBeenCalled();
    expect(mockTenantClient.consent.upsert).toHaveBeenCalledWith({
      where: {
        tenantId_contactoId_tipoContacto: {
          tenantId: 'tenant-1',
          contactoId: 'cust-1',
          tipoContacto: ContactType.CUSTOMER
        }
      },
      update: expect.objectContaining({
        estado: ConsentStatus.NO_CONSENTIDO
      }),
      create: expect.objectContaining({
        estado: ConsentStatus.NO_CONSENTIDO
      })
    });
    expect(mockTenantClient.auditLog.create).toHaveBeenCalled();
  });

  it('removeOptOut: debe remover contacto de la lista de exclusión y auditar', async () => {
    const existing = {
      id: 'opt-1',
      tenantId: 'tenant-1',
      contactoId: 'cust-1'
    };
    mockTenantClient.optOut.findFirst.mockResolvedValue(existing);
    mockTenantClient.optOut.deleteMany.mockResolvedValue({ count: 1 });

    const res = await service.removeOptOut('tenant-1', 'user-1', 'cust-1');
    expect(res.message).toContain('rehabilitado');
    expect(mockTenantClient.optOut.deleteMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', contactoId: 'cust-1' }
    });
    expect(mockTenantClient.auditLog.create).toHaveBeenCalled();
  });

  it('isOptedOut: debe verificar correctamente si un contacto está excluido', async () => {
    mockTenantClient.optOut.count.mockResolvedValueOnce(1);
    const check1 = await service.isOptedOut('tenant-1', 'cust-1');
    expect(check1).toBe(true);

    mockTenantClient.optOut.count.mockResolvedValueOnce(0);
    const check2 = await service.isOptedOut('tenant-1', 'cust-2');
    expect(check2).toBe(false);
  });
});
