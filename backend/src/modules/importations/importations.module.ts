import { Module } from '@nestjs/common';
import { SuppliersController } from './suppliers.controller.js';
import { SuppliersService } from './suppliers.service.js';
import { ImportationsController } from './importations.controller.js';
import { ImportationsService } from './importations.service.js';
import { InventoryModule } from '../inventory/inventory.module.js';
import { PrismaModule } from '../../prisma/prisma.module.js';

@Module({
  imports: [PrismaModule, InventoryModule],
  controllers: [SuppliersController, ImportationsController],
  providers: [SuppliersService, ImportationsService],
  exports: [ImportationsService, SuppliersService]
})
export class ImportationsModule {}
