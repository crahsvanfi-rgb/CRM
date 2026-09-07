import { Test, TestingModule } from '@nestjs/testing';
import { AiUsageService } from './ai-usage.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { AIOperationType } from '@prisma/client';
import { vi, describe, it, expect, beforeEach } from 'vitest';

describe('AiUsageService', () => {
  let service: AiUsageService;
  
  const mockCreate = vi.fn();
  
  const mockPrisma = {
    getTenantClient: vi.fn().mockReturnValue({
      aIUsage: {
        create: mockCreate
      }
    })
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AiUsageService,
        { provide: PrismaService, useValue: mockPrisma }
      ],
    }).compile();

    service = module.get<AiUsageService>(AiUsageService);
    mockCreate.mockClear();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should correctly calculate cost for gpt-4o-mini', async () => {
    mockCreate.mockResolvedValue({ id: '1' });
    
    await service.recordUsage('tenant-1', {
      agente: 'test',
      modelo: 'openai/gpt-4o-mini',
      tipoOperacion: AIOperationType.CHAT,
      promptTokens: 1000,
      completionTokens: 2000
    });

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        costoEntrada: 1000 * 0.00000015,
        costoSalida: 2000 * 0.0000006,
        costoTotal: (1000 * 0.00000015) + (2000 * 0.0000006)
      })
    }));
  });

  it('should correctly calculate cost for claude-3.5-sonnet', async () => {
    mockCreate.mockResolvedValue({ id: '2' });
    
    await service.recordUsage('tenant-1', {
      agente: 'test',
      modelo: 'anthropic/claude-3.5-sonnet',
      tipoOperacion: AIOperationType.FUNCTION_CALLING,
      promptTokens: 500,
      completionTokens: 1500
    });

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        costoEntrada: 500 * 0.000003,
        costoSalida: 1500 * 0.000015,
        costoTotal: (500 * 0.000003) + (1500 * 0.000015)
      })
    }));
  });

  it('should use default price for unknown model', async () => {
    mockCreate.mockResolvedValue({ id: '3' });
    
    await service.recordUsage('tenant-1', {
      agente: 'test',
      modelo: 'unknown/model',
      tipoOperacion: AIOperationType.OTRO,
      promptTokens: 100,
      completionTokens: 100
    });

    expect(mockCreate).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        costoEntrada: 100 * 0.000001,
        costoSalida: 100 * 0.000002,
        costoTotal: (100 * 0.000001) + (100 * 0.000002)
      })
    }));
  });
});
