import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Post, UseGuards,
} from '@nestjs/common';
import { MemberRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleGuard } from '../../common/guards/role.guard';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { ExecutionResponseDto } from './dto/execution-response.dto';
import { TriggerExecutionDto } from './dto/trigger-execution.dto';
import { ExecutionsService } from './executions.service';

@Controller('executions')
@UseGuards(RoleGuard)
export class ExecutionsController {
  constructor(private readonly executionsService: ExecutionsService) {}

  @Post()
  @Roles(MemberRole.EDITOR, MemberRole.ADMIN)
  trigger(
    @Body() dto: TriggerExecutionDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<ExecutionResponseDto> {
    return this.executionsService.trigger(dto, user);
  }

  @Get()
  findAllForOrg(@CurrentUser() user: JwtPayload): Promise<ExecutionResponseDto[]> {
    return this.executionsService.findAllForOrg(user);
  }

  @Get('project/:projectId')
  findAll(
    @Param('projectId') projectId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<ExecutionResponseDto[]> {
    return this.executionsService.findAll(projectId, user);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<ExecutionResponseDto> {
    return this.executionsService.findById(id, user);
  }

  @Get(':id/results')
  findResults(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.executionsService.findResults(id, user);
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  cancel(
    @Param('id') id: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.executionsService.cancel(id, user);
  }
}
