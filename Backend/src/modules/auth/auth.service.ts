import { ConflictException, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { MemberRole, Prisma, UiMode } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { parseDurationToSeconds } from '../../common/util/duration';
import { AuthTokensDto } from './dto/auth-tokens.dto';
import { LoginDto } from './dto/login.dto';
import { MeDto } from './dto/me.dto';
import { RegisterDto } from './dto/register.dto';

/** Intentos de `register` antes de rendirse con el slug de la organización. */
const REGISTER_MAX_ATTEMPTS = 5;

/** Respaldos si `JWT_EXPIRES_IN` / `REFRESH_TOKEN_EXPIRES_IN` faltan o vienen rotos. */
const DEFAULT_ACCESS_TOKEN_SECONDS = 15 * 60;
const DEFAULT_REFRESH_TOKEN_SECONDS = 7 * 24 * 60 * 60;

/**
 * `true` si el error es una violación de índice único de Prisma (P2002) sobre el
 * campo dado. `meta.target` llega como lista de columnas (o como cadena en algún
 * conector), así que se comprueban las dos formas.
 */
function isUniqueViolationOn(error: unknown, field: string): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError)) return false;
  if (error.code !== 'P2002') return false;

  const target = error.meta?.target;
  if (Array.isArray(target)) return target.includes(field);
  if (typeof target === 'string') return target.includes(field);
  return false;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<AuthTokensDto> {
    const existing = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (existing) throw new ConflictException('Email already registered');

    const passwordHash = await bcrypt.hash(dto.password, 12);

    // Entre el findUnique de arriba y el create de abajo cabe otro registro con el
    // mismo email; entre «este slug está libre» y su create cabe otra organización
    // con el mismo nombre. Los dos llegan como P2002 y antes salían por el 500:
    // el email es un 409 y el slug se reintenta con el sufijo siguiente.
    for (let attempt = 0; attempt < REGISTER_MAX_ATTEMPTS; attempt++) {
      const slug = await this.freeSlug(dto.organizationName);
      try {
        const result = await this.prisma.$transaction(async (tx) => {
          const user = await tx.user.create({
            data: { email: dto.email, displayName: dto.displayName, passwordHash },
          });
          const org = await tx.organization.create({
            data: { name: dto.organizationName, slug },
          });
          const membership = await tx.membership.create({
            data: { userId: user.id, organizationId: org.id, role: MemberRole.ADMIN },
          });
          return { user, org, membership };
        });

        return this.issueTokens(result.user.id, result.org.id, result.membership.role);
      } catch (error) {
        if (isUniqueViolationOn(error, 'email')) {
          throw new ConflictException('Email already registered');
        }
        if (isUniqueViolationOn(error, 'slug')) continue;
        throw error;
      }
    }

    throw new ConflictException(
      'Could not allocate an organization slug; try a different organization name',
    );
  }

  async login(dto: LoginDto, userAgent?: string, ipAddress?: string): Promise<AuthTokensDto> {
    const user = await this.prisma.user.findUnique({
      where: { email: dto.email },
    });
    if (!user || !user.isActive) throw new UnauthorizedException('Invalid credentials');

    const valid = await bcrypt.compare(dto.password, user.passwordHash);
    if (!valid) throw new UnauthorizedException('Invalid credentials');

    const orgId = await this.resolveOrgId(user.id, dto.orgId);
    const membership = await this.prisma.membership.findUnique({
      where: { userId_organizationId: { userId: user.id, organizationId: orgId } },
    });
    if (!membership) throw new UnauthorizedException('Not a member of this organization');

    return this.issueTokens(user.id, orgId, membership.role, userAgent, ipAddress);
  }

  async refresh(rawToken: string): Promise<AuthTokensDto> {
    const tokenHash = this.hashToken(rawToken);
    const stored = await this.prisma.refreshToken.findUnique({ where: { tokenHash } });

    if (!stored || stored.revokedAt !== null || stored.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    // Un usuario desactivado no puede seguir renovando tokens (antes lo hacía hasta expirar).
    const user = await this.prisma.user.findUnique({ where: { id: stored.userId } });
    if (!user || !user.isActive) throw new UnauthorizedException('User is inactive');

    // Rotación: revocar el token actual antes de emitir el nuevo
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    // Mantener la org de la sesión original. Solo si el token es previo a la migración
    // (sin organizationId) se recae en la membresía más antigua.
    const membership = stored.organizationId
      ? await this.prisma.membership.findUnique({
          where: {
            userId_organizationId: { userId: stored.userId, organizationId: stored.organizationId },
          },
        })
      : await this.prisma.membership.findFirst({
          where: { userId: stored.userId },
          orderBy: { joinedAt: 'asc' },
        });
    if (!membership) throw new UnauthorizedException('No active membership found');

    return this.issueTokens(stored.userId, membership.organizationId, membership.role);
  }

  async logout(rawToken: string): Promise<void> {
    const tokenHash = this.hashToken(rawToken);
    await this.prisma.refreshToken.updateMany({
      where: { tokenHash, revokedAt: null },
      data: { revokedAt: new Date() },
    });
  }

  /**
   * Quién soy, leído de la base en cada llamada — no del token.
   *
   * `uiMode` cambia sin volver a entrar, así que no puede vivir en el JWT: si viviera ahí,
   * el usuario pulsaría el interruptor y no pasaría nada hasta el siguiente login.
   */
  async me(userId: string, orgId: string): Promise<MeDto> {
    const user = await this.prisma.user.findFirst({
      where: { id: userId, isActive: true },
      select: { id: true, email: true, displayName: true, uiMode: true },
    });
    if (!user) throw new UnauthorizedException('User not found');

    const membership = await this.prisma.membership.findFirst({
      where: { userId, organizationId: orgId },
      select: { role: true },
    });
    if (!membership) throw new UnauthorizedException('User is not a member of this organization');

    return {
      id: user.id,
      email: user.email,
      displayName: user.displayName,
      orgId,
      role: membership.role,
      uiMode: user.uiMode,
    };
  }

  /** Cambia el modo de interfaz del propio usuario. No lo puede cambiar nadie por él. */
  async updateUiMode(userId: string, orgId: string, uiMode: UiMode): Promise<MeDto> {
    await this.prisma.user.update({ where: { id: userId }, data: { uiMode } });
    return this.me(userId, orgId);
  }

  private async issueTokens(
    userId: string,
    orgId: string,
    role: MemberRole,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthTokensDto> {
    const payload: JwtPayload = { sub: userId, orgId, role };
    const accessToken = this.jwt.sign(payload);

    const rawRefresh = crypto.randomBytes(40).toString('hex');
    const tokenHash = this.hashToken(rawRefresh);

    await this.prisma.refreshToken.create({
      data: {
        userId,
        organizationId: orgId, // el reissue mantendrá esta org
        tokenHash,
        expiresAt: this.refreshExpiry(),
        userAgent,
        ipAddress,
      },
    });

    return {
      accessToken,
      refreshToken: rawRefresh,
      expiresIn: this.accessTokenSeconds(),
    };
  }

  private async resolveOrgId(userId: string, orgId?: string): Promise<string> {
    if (orgId) return orgId;
    const membership = await this.prisma.membership.findFirst({
      where: { userId },
      orderBy: { joinedAt: 'asc' },
    });
    if (!membership) throw new UnauthorizedException('User has no organization');
    return membership.organizationId;
  }

  private hashToken(token: string): string {
    return crypto.createHash('sha256').update(token).digest('hex');
  }

  /**
   * Segundos de vida del access token, leídos de `JWT_EXPIRES_IN`. Antes iba
   * quemado a 900: si alguien cambiaba la variable, el cliente seguía oyendo
   * «15 minutos» y refrescaba tarde (o pronto de más).
   */
  private accessTokenSeconds(): number {
    return parseDurationToSeconds(
      this.config.get<string>('JWT_EXPIRES_IN'),
      DEFAULT_ACCESS_TOKEN_SECONDS,
    );
  }

  private refreshExpiry(): Date {
    // Antes: `parseInt(expiry.replace('d', ''))` — con `'24h'` daba 24 y lo trataba
    // como 24 DÍAS. El parser entiende s/m/h/d/w y un número suelto como segundos.
    const seconds = parseDurationToSeconds(
      this.config.get<string>('REFRESH_TOKEN_EXPIRES_IN'),
      DEFAULT_REFRESH_TOKEN_SECONDS,
    );
    return new Date(Date.now() + seconds * 1000);
  }

  /**
   * Devuelve un slug libre *en este momento*. No garantiza que lo siga estando al
   * hacer el insert — eso lo resuelve el reintento de `register` ante el P2002.
   */
  private async freeSlug(name: string): Promise<string> {
    const base = name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .substring(0, 48);

    let slug = base;
    let attempt = 0;
    while (await this.prisma.organization.findUnique({ where: { slug } })) {
      attempt++;
      slug = `${base}-${attempt}`;
    }
    return slug;
  }
}
