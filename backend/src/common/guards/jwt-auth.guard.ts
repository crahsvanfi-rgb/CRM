import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Observable } from 'rxjs';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const request = context.switchToHttp().getRequest();
    const tenantId = request.headers['x-tenant-id'] || 'dummy-tenant-id';
    const userId = request.headers['x-user-id'] || 'dummy-user-id';
    const roleName = request.headers['x-role'] || 'Admin';
    request.user = { tenantId, id: userId, userId, sub: userId, role: { name: roleName } };
    return true;
  }
}
