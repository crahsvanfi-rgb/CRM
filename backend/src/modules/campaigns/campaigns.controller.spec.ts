import { Test, TestingModule } from '@nestjs/testing';
import { CampaignsController } from './campaigns.controller.js';
import { CampaignsService } from './campaigns.service.js';
import { PrismaService } from '../../prisma/prisma.service.js';

describe('CampaignsController', () => {
  let controller: CampaignsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [CampaignsController],
      providers: [
        { provide: CampaignsService, useValue: {} },
        { provide: PrismaService, useValue: {} }
      ],
    }).compile();

    controller = module.get<CampaignsController>(CampaignsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
