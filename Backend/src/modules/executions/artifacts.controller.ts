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
    const user = this.authenticate(token ?? this.bearerToken(req));

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

  private authenticate(token: string | undefined): JwtPayload {
    if (!token) throw new UnauthorizedException('Missing token');
    try {
      const payload = this.jwt.verify<JwtPayload & { kind?: string }>(token);
      // Solo tokens de usuario: el token de sesión del recorder no da acceso a artefactos.
      if (payload.kind || !payload.sub || !payload.orgId) throw new Error('not a user token');
      return payload;
    } catch {
      throw new UnauthorizedException('Invalid token');
    }
  }
}
