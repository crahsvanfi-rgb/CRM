import { Test, TestingModule } from '@nestjs/testing';
import { SegmentsController } from './segments.controller.js';
import { SegmentsService } from './segments.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

describe('SegmentsController', () => {
  let controller: SegmentsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SegmentsController],
      providers: [
        { provide: SegmentsService, useValue: {} },
        { provide: PrismaService, useValue: {} }
      ],
    }).compile();

    controller = module.get<SegmentsController>(SegmentsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
