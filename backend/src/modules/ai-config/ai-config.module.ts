import { Module } from '@nestjs/common';
import { AiConfigController } from './ai-config.controller.js';
import { AiConfigService } from './ai-config.service.js';
import { EncryptionService } from '../../common/services/encryption.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule],
  controllers: [AiConfigController],
  providers: [AiConfigService, EncryptionService],
  exports: [AiConfigService],
})
export class AiConfigModule {}
