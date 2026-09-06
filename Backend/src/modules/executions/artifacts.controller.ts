import {
  Controller,
  Get,
  NotFoundException,
  Param,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import type { Request, Response } from 'express';
import * as fs from 'fs';
import * as path from 'path';
import { Public } from '../../common/decorators/public.decorator';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';

// Nombres que genera el executor: `${testId}_final.png`, `${testId}.webm`,
// `${stepId}_failure.{html,png}`, `${stepId}.png`, `${testId}.zip`.
const SAFE_FILENAME = /^[A-Za-z0-9][A-Za-z0-9._-]*$/;
const SAFE_ID = /^[A-Za-z0-9-]+$/;

/**
 * Sirve los artefactos de ejecución con autenticación y verificación de organización.
 * Sustituye al estático de Express (`useStaticAssets`), que quedaba fuera del
 * JwtAuthGuard global y exponía screenshots, videos y el HTML del fallo (DOM
 * completo de la página del cliente) a cualquiera con la URL, cross-tenant.
 */
@Controller('artifacts')
export class ArtifactsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  /**
   * @Public porque `<video>/<img>/<a>` no pueden mandar el header Authorization:
   * el token viaja en `?token=` y se verifica manualmente aquí (mismo JWT de acceso).
   */
  @Public()
  @Get(':executionId/:filename')
  async serve(
    @Param('executionId') executionId: string,
    @Param('filename') filename: string,
    @Query('token') token: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    // De donde viene la credencial importa tanto como cual es: por la direccion solo se
    // acepta el pase de artefacto; el token de usuario, unicamente por cabecera.
    const enCabecera = this.bearerToken(req);
    const user = enCabecera
      ? this.authenticate(enCabecera, executionId, 'cabecera')
      : this.authenticate(token, executionId, 'direccion');

    if (!SAFE_ID.test(executionId) || !SAFE_FILENAME.test(filename) || filename.includes('..')) {
      throw new NotFoundException('Artifact not found');
    }

    const execution = await this.prisma.execution.findFirst({
      where: { id: executionId, project: { organizationId: user.orgId } },
      select: { id: true },
    });
    if (!execution) throw new NotFoundException('Artifact not found');

    const base = path.resolve(this.config.get<string>('ARTIFACTS_VOLUME_PATH', '/artifacts'));
    const filePath = path.resolve(base, executionId, filename);
    if (!filePath.startsWith(base + path.sep) || !fs.existsSync(filePath)) {
      throw new NotFoundException('Artifact not found');
    }

    // sendFile fija Content-Type por extensión y soporta Range (streaming de video).
    await new Promise<void>((resolve, reject) => {
      res.sendFile(filePath, (err) => (err ? reject(err) : resolve()));
    });
  }

  private bearerToken(req: Request): string | undefined {
    return req.headers.authorization?.replace(/^Bearer\s+/i, '');
  }

  /**
   * Acepta dos clases de credencial, y solo dos:
   *
   *   - **Pase de artefacto** (`kind: 'artifact'`), que es el que usa la pantalla. Solo vale
   *     para UNA ejecución y caduca en diez minutos. Va en la direccion porque `<video>` e
   *     `<img>` no pueden mandar cabeceras, y una direccion acaba en el log del servidor, en
   *     el historial del navegador y en cualquier intermediario. Si este se filtra, lo unico
   *     que abre son los artefactos de esa ejecucion, y solo un rato.
   *   - **Token de usuario en la cabecera** `Authorization`, para llamadas programaticas.
   *
   * Lo que NO acepta desde el `2026-09-05`: el token de sesion completo en la direccion. Era
   * lo que se hacia, y significaba que un vistazo al log de nginx entregaba la cuenta entera.
   */
  private authenticate(
    token: string | undefined,
    executionId: string,
    origen: 'cabecera' | 'direccion',
  ): JwtPayload {
    if (!token) throw new UnauthorizedException('Missing token');
    try {
      const payload = this.jwt.verify<JwtPayload & { kind?: string; executionId?: string }>(token);

      // Un token de usuario por la direccion se RECHAZA aunque sea valido. Es lo que se
      // hacia hasta el 2026-09-05 y significaba que un vistazo al log de nginx entregaba la
      // cuenta entera. Aceptarlo "por compatibilidad" habria dejado el agujero abierto.
      if (origen === 'direccion' && payload.kind !== 'artifact') {
        throw new Error('por la direccion solo se admite un pase de artefacto');
      }

      if (payload.kind === 'artifact') {
        // Un pase de otra ejecución no vale para esta, aunque sea de la misma organización.
        if (payload.executionId !== executionId) throw new Error('pase de otra ejecucion');
        if (!payload.orgId) throw new Error('pase sin organizacion');
        return payload;
      }

      // Token de usuario: solo por cabecera. El de sesión del recorder nunca vale.
      if (payload.kind || !payload.sub || !payload.orgId) throw new Error('not a user token');
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
