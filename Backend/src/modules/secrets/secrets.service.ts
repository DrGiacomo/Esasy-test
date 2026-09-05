import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { VaultService } from '../../infrastructure/vault/vault.service';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { CreateSecretDto } from './dto/create-secret.dto';
import { SecretResponseDto } from './dto/secret-response.dto';

@Injectable()
export class SecretsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly vault: VaultService,
  ) {}

  async create(dto: CreateSecretDto, user: JwtPayload): Promise<SecretResponseDto> {
    const existing = await this.prisma.secret.findUnique({
      where: { organizationId_name: { organizationId: user.orgId, name: dto.name } },
    });
    if (existing) throw new ConflictException(`Secret "${dto.name}" already exists`);

    const encryptedValue = this.vault.encrypt(dto.value);
    const secret = await this.prisma.secret.create({
      data: {
        organizationId: user.orgId,
        name: dto.name,
        encryptedValue,
        type: dto.type,
        description: dto.description,
      },
    });

    return this.toResponse(secret);
  }

  async findAll(user: JwtPayload): Promise<SecretResponseDto[]> {
    const secrets = await this.prisma.secret.findMany({
      where: { organizationId: user.orgId },
      orderBy: { name: 'asc' },
    });
    return secrets.map((s) => this.toResponse(s));
  }

  async remove(id: string, user: JwtPayload): Promise<void> {
    const secret = await this.prisma.secret.findFirst({
      where: { id, organizationId: user.orgId },
    });
    if (!secret) throw new NotFoundException('Secret not found');
    await this.prisma.secret.delete({ where: { id } });
  }

  private toResponse(s: {
    id: string;
    organizationId: string;
    name: string;
    type: import('@prisma/client').SecretType;
    description: string | null;
    createdAt: Date;
    updatedAt: Date;
  }): SecretResponseDto {
    return {
      id: s.id,
      organizationId: s.organizationId,
      name: s.name,
      type: s.type,
      description: s.description,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
    };
  }
}
