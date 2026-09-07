import { Module } from '@nestjs/common';
import { AutomationsController } from './automations.controller.js';
import { AutomationEngineService } from './automation-engine.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [AutomationsController],
  providers: [AutomationEngineService],
  exports: [AutomationEngineService],
})
export class AutomationsModule {}
