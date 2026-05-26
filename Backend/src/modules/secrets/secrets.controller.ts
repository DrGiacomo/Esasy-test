import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards,
} from '@nestjs/common';
import { MemberRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleGuard } from '../../common/guards/role.guard';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { CreateSecretDto } from './dto/create-secret.dto';
import { SecretResponseDto } from './dto/secret-response.dto';
import { SecretsService } from './secrets.service';

@Controller('secrets')
@UseGuards(RoleGuard)
export class SecretsController {
  constructor(private readonly secretsService: SecretsService) {}

  @Post()
  @Roles(MemberRole.ADMIN)
  create(
    @Body() dto: CreateSecretDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<SecretResponseDto> {
    return this.secretsService.create(dto, user);
  }

  @Get()
  findAll(@CurrentUser() user: JwtPayload): Promise<SecretResponseDto[]> {
    return this.secretsService.findAll(user);
  }

  @Delete(':id')
  @Roles(MemberRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.secretsService.remove(id, user);
  }
}
