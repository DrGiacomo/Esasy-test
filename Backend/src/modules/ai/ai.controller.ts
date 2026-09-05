import { Body, Controller, Param, Post, UseGuards } from '@nestjs/common';
import { MemberRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleGuard } from '../../common/guards/role.guard';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import {
  ChatRequestDto,
  CodegenRequestDto,
  DocumentationRequestDto,
  HealingReviewDto,
  HealStepRequestDto,
  NlToFlowRequestDto,
} from './dto/ai-request.dto';
import { ChatService } from './operations/chat.service';
import { CodegenService } from './operations/codegen.service';
import { DocumentationService } from './operations/documentation.service';
import { NlToFlowService } from './operations/nl-to-flow.service';
import { SelfHealingService } from './operations/self-healing.service';

@Controller('ai')
@UseGuards(RoleGuard)
export class AiController {
  constructor(
    private readonly chatService: ChatService,
    private readonly codegenService: CodegenService,
    private readonly documentationService: DocumentationService,
    private readonly nlToFlowService: NlToFlowService,
    private readonly selfHealingService: SelfHealingService,
  ) {}

  @Post('chat')
  chat(@Body() dto: ChatRequestDto, @CurrentUser() user: JwtPayload) {
    return this.chatService.chat(dto.messages, user.sub, user.orgId, dto.relatedTestId);
  }

  @Post('codegen')
  @Roles(MemberRole.EDITOR, MemberRole.ADMIN)
  codegen(@Body() dto: CodegenRequestDto, @CurrentUser() user: JwtPayload) {
    return this.codegenService.generate(dto.testId, user.sub, user.orgId);
  }

  /** Documentación en lenguaje llano. Es lo que el modo SENCILLO enseña de un test. */
  @Post('documentation')
  @Roles(MemberRole.EDITOR, MemberRole.ADMIN)
  documentation(@Body() dto: DocumentationRequestDto, @CurrentUser() user: JwtPayload) {
    return this.documentationService.generate(dto.testId, user.sub, user.orgId);
  }

  @Post('nl-to-flow')
  @Roles(MemberRole.EDITOR, MemberRole.ADMIN)
  nlToFlow(@Body() dto: NlToFlowRequestDto, @CurrentUser() user: JwtPayload) {
    return this.nlToFlowService.convert(dto.prompt, dto.projectId, user.sub, user.orgId);
  }

  @Post('heal')
  @Roles(MemberRole.EDITOR, MemberRole.ADMIN)
  proposeHeal(@Body() dto: HealStepRequestDto, @CurrentUser() user: JwtPayload) {
    return this.selfHealingService.propose(dto.stepId, dto.pageHtml, user.sub, user.orgId);
  }

  @Post('heal/:healingLogId/approve')
  @Roles(MemberRole.EDITOR, MemberRole.ADMIN)
  approveHeal(@Param('healingLogId') healingLogId: string, @CurrentUser() user: JwtPayload) {
    return this.selfHealingService.approve(healingLogId, user.sub, user.orgId);
  }

  @Post('heal/:healingLogId/reject')
  @Roles(MemberRole.EDITOR, MemberRole.ADMIN)
  rejectHeal(
    @Param('healingLogId') healingLogId: string,
    @Body() dto: HealingReviewDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.selfHealingService.reject(healingLogId, user.sub, user.orgId, dto.rejectionReason);
  }
}
