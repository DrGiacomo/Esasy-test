import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { MemberRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleGuard } from '../../common/guards/role.guard';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectResponseDto } from './dto/project-response.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import { ProjectsService } from './projects.service';

@Controller('projects')
@UseGuards(RoleGuard)
export class ProjectsController {
  constructor(private readonly projectsService: ProjectsService) {}

  @Post()
  @Roles(MemberRole.EDITOR, MemberRole.ADMIN)
  create(
    @Body() dto: CreateProjectDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.create(dto, user);
  }

  @Get()
  findAll(
    @CurrentUser() user: JwtPayload,
    @Query('archived') archived?: string,
  ): Promise<ProjectResponseDto[]> {
    return this.projectsService.findAll(user, archived === 'true');
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<ProjectResponseDto> {
    return this.projectsService.findById(id, user);
  }

  @Patch(':id')
  @Roles(MemberRole.EDITOR, MemberRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateProjectDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ProjectResponseDto> {
    return this.projectsService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(MemberRole.EDITOR, MemberRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  archive(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<void> {
    return this.projectsService.archive(id, user);
  }
}
