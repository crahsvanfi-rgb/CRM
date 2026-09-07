import { Test, TestingModule } from '@nestjs/testing';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import { ActivitiesService } from './activities.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';
import { BadRequestException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { ActivityStatus, ActivityType } from '@prisma/client';

describe('ActivitiesService', () => {
  let service: ActivitiesService;
  let mockPrismaClient: any;

  beforeEach(async () => {
    mockPrismaClient = {
      customer: { findUnique: vi.fn() },
      lead: { findUnique: vi.fn() },
      user: { findUnique: vi.fn() },
      activity: {
        create: vi.fn(),
        findUnique: vi.fn(),
        findMany: vi.fn(),
        update: vi.fn(),
        count: vi.fn(),
      }
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ActivitiesService,
        {
          provide: PrismaService,
          useValue: {
            getTenantClient: vi.fn().mockReturnValue(mockPrismaClient)
          }
        }
      ],
    }).compile();

    service = module.get<ActivitiesService>(ActivitiesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create activity', () => {
    it('should create an activity with valid relations', async () => {
      mockPrismaClient.customer.findUnique.mockResolvedValue({ id: 'client-1' });
      mockPrismaClient.user.findUnique.mockResolvedValue({ id: 'user-1' });
      mockPrismaClient.activity.create.mockResolvedValue({ id: 'act-1', estado: ActivityStatus.PENDIENTE });

      const dto = {
        tipo: ActivityType.LLAMADA,
        titulo: 'Test call',
        fecha: '2026-09-03',
        responsableId: 'user-1',
        clienteId: 'client-1'
      };

      const result = await service.create('tenant-1', dto);
      expect(result).toHaveProperty('id');
      expect(mockPrismaClient.activity.create).toHaveBeenCalled();
    });
  });

  describe('complete activity', () => {
    it('should not allow modifying a cancelled activity', async () => {
      mockPrismaClient.activity.findUnique.mockResolvedValue({
        id: 'act-1',
        estado: ActivityStatus.CANCELADA
      });

      await expect(service.update('tenant-1', 'act-1', { estado: ActivityStatus.COMPLETADA }))
        .rejects
        .toThrow(ForbiddenException);
    });
  });

  describe('calendar', () => {
    it('should list calendar in date range', async () => {
      mockPrismaClient.activity.findMany.mockResolvedValue([{ id: 'act-1', titulo: 'Test' }]);
      
      const result = await service.getCalendar('tenant-1', '2026-09-01', '2026-09-30');
      expect(result.length).toBe(1);
      expect(mockPrismaClient.activity.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            fecha: expect.objectContaining({
              gte: new Date('2026-09-01'),
              lte: new Date('2026-09-30')
            })
          })
        })
      );
    });
  });
});
