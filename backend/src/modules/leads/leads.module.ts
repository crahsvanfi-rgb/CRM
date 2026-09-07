import { Module } from '@nestjs/common';
import { LeadsService } from './leads.service.js';
import { LeadsController } from './leads.controller.js';

@Module({
  controllers: [LeadsController],
  providers: [LeadsService],
})
export class LeadsModule {}
