import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus, Param, Post, UseGuards,
} from '@nestjs/common';
import { MemberRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleGuard } from '../../common/guards/role.guard';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { CreateGitIntegrationDto, GitIntegrationResponseDto } from './dto/git-integration.dto';
import { GitService } from './git.service';

@Controller('git')
@UseGuards(RoleGuard)
export class GitController {
  constructor(private readonly gitService: GitService) {}

  @Post('integrations')
  @Roles(MemberRole.ADMIN)
  create(
    @Body() dto: CreateGitIntegrationDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<GitIntegrationResponseDto> {
    return this.gitService.create(dto, user);
  }

  @Get('integrations')
  findAll(@CurrentUser() user: JwtPayload): Promise<GitIntegrationResponseDto[]> {
    return this.gitService.findAll(user);
  }

  @Delete('integrations/:id')
  @Roles(MemberRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.gitService.remove(id, user);
  }

  @Post('sync/:testId')
  @Roles(MemberRole.EDITOR, MemberRole.ADMIN)
  sync(
    @Param('testId') testId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<{ message: string }> {
    return this.gitService.sync(testId, user);
  }
}
