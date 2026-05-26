import {
  Body, Controller, Delete, HttpCode, HttpStatus, Param, Post, UseGuards,
} from '@nestjs/common';
import { MemberRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleGuard } from '../../common/guards/role.guard';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { StartRecordingDto } from './dto/start-recording.dto';
import { RecorderService } from './recorder.service';
import { RecorderSession } from './recorder-session';

@Controller('recorder/sessions')
@UseGuards(RoleGuard)
export class RecorderController {
  constructor(private readonly recorderService: RecorderService) {}

  @Post()
  @Roles(MemberRole.EDITOR, MemberRole.ADMIN)
  start(
    @Body() dto: StartRecordingDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<RecorderSession> {
    return this.recorderService.start(dto.projectId, dto.targetUrl, user);
  }

  @Delete(':sessionId')
  @HttpCode(HttpStatus.NO_CONTENT)
  stop(
    @Param('sessionId') sessionId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.recorderService.stop(sessionId, user);
  }
}
