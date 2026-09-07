import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { PrismaService } from '../../prisma/prisma.service.js';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
  constructor(private prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    const { method, url, body, headers } = request;
    
    // Solo registrar mutaciones (POST, PATCH, DELETE, PUT)
    if (['POST', 'PATCH', 'DELETE', 'PUT'].includes(method)) {
      const tenantId = headers['x-tenant-id'] || request.user?.tenantId;
      const userId = headers['x-user-id'] || request.user?.id || request.user?.sub;

      if (tenantId && userId) {
        // Ejecutar después de que el controlador finalizó exitosamente
        return next.handle().pipe(
          tap(() => {
            // Guardar log en background
            this.prisma.auditLog.create({
              data: {
                tenantId,
                userId: userId,
                action: `${method} ${url}`,
                details: JSON.stringify({ body, params: request.params }),
              }
            }).catch(err => console.error('Error guardando AuditLog:', err));
          }),
        );
      }
    }

    return next.handle();
  }
}
