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
  start(@Body() dto: StartRecordingDto, @CurrentUser() user: JwtPayload) {
    return this.recorderService.start(dto.projectId, dto.targetUrl, user);
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
