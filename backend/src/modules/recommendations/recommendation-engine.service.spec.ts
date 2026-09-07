import { vi } from 'vitest';
import { Test, TestingModule } from '@nestjs/testing';
import { RecommendationEngineService } from './recommendation-engine.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { Logger } from '@nestjs/common';

describe('RecommendationEngineService', () => {
  let service: RecommendationEngineService;
  let prismaService: PrismaService;

  const mockPrismaService = {
    tenant: {
      findMany: vi.fn().mockResolvedValue([{ id: 'tenant-1' }]),
    },
    getTenantClient: vi.fn().mockReturnValue({
      recommendation: {
        findFirst: vi.fn().mockResolvedValue(null),
        create: vi.fn().mockResolvedValue({ id: '1' }),
        findMany: vi.fn().mockResolvedValue([]),
      },
      customer: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      order: {
        findMany: vi.fn().mockResolvedValue([]),
        count: vi.fn().mockResolvedValue(0),
      },
      quote: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      productStock: {
        findMany: vi.fn().mockResolvedValue([]),
      },
      activity: {
        findMany: vi.fn().mockResolvedValue([]),
      },
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RecommendationEngineService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RecommendationEngineService>(RecommendationEngineService);
    prismaService = module.get<PrismaService>(PrismaService);
    vi.spyOn(Logger.prototype, 'log').mockImplementation(() => {});
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  it('should generate recommendations for tenant successfully', async () => {
    const result = await service.generateForTenant('tenant-1');
    expect(result).toHaveProperty('generated');
    expect(result.generated).toBe(0); // Since we mocked empty data
  });

  it('should run cron job successfully', async () => {
    const generateSpy = vi.spyOn(service, 'generateForTenant').mockResolvedValue({ generated: 1 });
    await service.handleCron();
    expect(generateSpy).toHaveBeenCalledWith('tenant-1');
  });

  it('should fetch active recommendations', async () => {
    const result = await service.getActiveRecommendations('tenant-1');
    expect(result).toEqual([]);
  });
});
