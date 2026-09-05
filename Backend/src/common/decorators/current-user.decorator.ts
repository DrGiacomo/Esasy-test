import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { JwtPayload } from '../interfaces/jwt-payload.interface';
import type { RequestConUsuario } from '../types/request-con-usuario';

export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): JwtPayload => {
    // Con el tipo puesto: `getRequest()` a secas devuelve `any`, y con `any` TypeScript
    // deja de comprobar `.user`. El JwtAuthGuard ya garantizó que existe al llegar aquí.
    const request = ctx.switchToHttp().getRequest<RequestConUsuario>();
    return request.user!;
  },
);
