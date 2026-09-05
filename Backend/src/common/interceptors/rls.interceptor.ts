import { CallHandler, ExecutionContext, Injectable, NestInterceptor } from '@nestjs/common';
import { Observable } from 'rxjs';
import { PrismaService } from '../../prisma/prisma.service';
import type { RequestConUsuario } from '../types/request-con-usuario';

@Injectable()
export class RlsInterceptor implements NestInterceptor {
  constructor(private readonly prisma: PrismaService) {}

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<RequestConUsuario>();
    const user = request.user;

    if (user?.orgId) {
      // SET LOCAL aplica solo en la transacción/sesión actual de PostgreSQL.
      // Las políticas RLS usan current_setting('app.current_org_id') para filtrar.
      void this.prisma.$executeRawUnsafe(`SET LOCAL app.current_org_id = '${user.orgId}'`);
    }

    return next.handle();
  }
}
