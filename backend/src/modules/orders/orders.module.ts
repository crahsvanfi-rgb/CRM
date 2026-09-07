import { Module } from '@nestjs/common';
import { OrdersController } from './orders.controller.js';
import { OrdersService } from './orders.service.js';
import { PrismaModule } from '../../prisma/prisma.module.js';
import { InventoryModule } from '../inventory/inventory.module.js';

@Module({
  imports: [PrismaModule, InventoryModule],
  controllers: [OrdersController],
  providers: [OrdersService]
})
export class OrdersModule {}
