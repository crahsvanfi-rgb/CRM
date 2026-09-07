// @ts-nocheck
import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Prisma Client Extension for Multitenancy (RLS).
   * Inyecta automáticamente el tenantId en todas las consultas y mutaciones.
   */
  getTenantClient(tenantId: string): any {
    return this.$extends({
      query: {
        $allModels: {
          async $allOperations({ model, operation, args, query }) {
            // Ignorar el modelo Tenant (ya que es global)
            if (model === 'Tenant') return query(args);

            // Inyectar en escrituras
            if (operation === 'create' || operation === 'createMany') {
              if (Array.isArray(args.data)) {
                args.data = args.data.map(d => ({ ...d, tenantId }));
              } else if (args.data) {
                args.data = { ...args.data, tenantId };
              }
            } 
            // Inyectar en lecturas y actualizaciones/borrados
            else if (['findUnique', 'findMany', 'findFirst', 'update', 'updateMany', 'delete', 'deleteMany', 'count', 'aggregate', 'groupBy'].includes(operation)) {
              args.where = { ...args.where, tenantId };
            }
            
            return query(args);
          },
        },
      },
    });
  }
}
