import {
  Body, Controller, Delete, Get, HttpCode, HttpStatus,
  Param, Post, Query, UseGuards,
} from '@nestjs/common';
import { MemberRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleGuard } from '../../common/guards/role.guard';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { StartRecordingDto } from './dto/start-recording.dto';
import { ConvertRecordingDto } from './dto/convert-recording.dto';
import { RecorderService } from './recorder.service';

@Controller('recorder')
@UseGuards(RoleGuard)
export class RecorderController {
  constructor(private readonly recorderService: RecorderService) {}

  @Post('sessions')
  @Roles(MemberRole.EDITOR, MemberRole.ADMIN)
  async start(@Body() dto: StartRecordingDto, @CurrentUser() user: JwtPayload) {
    const session = await this.recorderService.start(dto.projectId, dto.targetUrl, user);
    // Proyectar solo campos serializables: la sesión interna lleva `expireTimer`
    // (un NodeJS.Timeout) que rompe JSON.stringify, y `containerId`/`orgId` no
    // deben exponerse al cliente.
    return {
      sessionId: session.sessionId,
      projectId: session.projectId,
      targetUrl: session.targetUrl,
      status: session.status,
      startedAt: session.startedAt,
    };
  }

  @Delete('sessions/:sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  stop(@Param('sessionId') sessionId: string, @CurrentUser() user: JwtPayload) {
    return this.recorderService.stop(sessionId, user);
  }

  @Get('recordings')
  @Roles(MemberRole.VIEWER, MemberRole.EDITOR, MemberRole.ADMIN)
  getRecordings(@CurrentUser() user: JwtPayload, @Query('projectId') projectId?: string) {
    return this.recorderService.getRecordings(user.orgId, projectId);
  }

  @Get('recordings/:id')
  @Roles(MemberRole.VIEWER, MemberRole.EDITOR, MemberRole.ADMIN)
  getRecording(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.recorderService.getRecording(id, user.orgId);
  }

  @Delete('recordings/:id')
  @HttpCode(HttpStatus.NO_CONTENT)
  @Roles(MemberRole.EDITOR, MemberRole.ADMIN)
  deleteRecording(@Param('id') id: string, @CurrentUser() user: JwtPayload) {
    return this.recorderService.deleteRecording(id, user.orgId);
  }

  @Post('recordings/:id/convert')
  @Roles(MemberRole.EDITOR, MemberRole.ADMIN)
  convertToTest(
    @Param('id') id: string,
    @Body() dto: ConvertRecordingDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.recorderService.convertToTest(id, dto.suiteId, dto.testName, user.orgId);
  }
}
