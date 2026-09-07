import { Test, TestingModule } from '@nestjs/testing';
import { SegmentsService } from './segments.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

describe('SegmentsService', () => {
  let service: SegmentsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SegmentsService,
        { provide: PrismaService, useValue: {} },
      ],
    }).compile();

    service = module.get<SegmentsService>(SegmentsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
