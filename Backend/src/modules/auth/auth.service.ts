import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { MemberRole } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthTokensDto } from './dto/auth-tokens.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

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
    const slug = await this.uniqueSlug(dto.organizationName);

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
  }

  async login(
    dto: LoginDto,
    userAgent?: string,
    ipAddress?: string,
  ): Promise<AuthTokensDto> {
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

    // Rotación: revocar el token actual antes de emitir el nuevo
    await this.prisma.refreshToken.update({
      where: { id: stored.id },
      data: { revokedAt: new Date() },
    });

    // Obtener la membresía más antigua del usuario (org principal)
    const membership = await this.prisma.membership.findFirst({
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
        tokenHash,
        expiresAt: this.refreshExpiry(),
        userAgent,
        ipAddress,
      },
    });

    return { accessToken, refreshToken: rawRefresh, expiresIn: 900 };
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

  private refreshExpiry(): Date {
    const expiry = this.config.get<string>('REFRESH_TOKEN_EXPIRES_IN', '7d');
    const days = parseInt(expiry.replace('d', ''), 10) || 7;
    const date = new Date();
    date.setDate(date.getDate() + days);
    return date;
  }

  private async uniqueSlug(name: string): Promise<string> {
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
