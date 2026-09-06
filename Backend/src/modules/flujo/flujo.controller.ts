import { Controller, Get } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { FlujoService, type ResumenDelFlujo } from './flujo.service';

@Controller('flujo')
export class FlujoController {
  constructor(private readonly flujoService: FlujoService) {}

  /**
   * Qué hay en cada punto del recorrido, ahora mismo. Lo consume el diagrama del flujo.
   *
   * Sin rol exigido a propósito: es un recuento de lo que ya puede ver cualquiera de la
   * organización, incluido un VIEWER. Negárselo a quien solo mira sería negarle saber en
   * qué estado está lo que está mirando.
   */
  @Get('resumen')
  resumen(@CurrentUser() user: JwtPayload): Promise<ResumenDelFlujo> {
    return this.flujoService.resumen(user.orgId);
  }
}
