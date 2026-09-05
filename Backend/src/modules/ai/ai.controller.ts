import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
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
import { DeepSeekProvider } from './providers/deepseek.provider';
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
    private readonly deepseek: DeepSeekProvider,
    private readonly codegenService: CodegenService,
    private readonly documentationService: DocumentationService,
    private readonly nlToFlowService: NlToFlowService,
    private readonly selfHealingService: SelfHealingService,
  ) {}

  /**
   * Si la IA está disponible, para que una interfaz pueda no ofrecer lo que va a fallar.
   *
   * ⚠️ HOY NADIE LO LLAMA. La interfaz de IA (`Frontend/src/features/ai-assistant/`) está
   * escrita pero no montada en ninguna ruta, así que no hay botón de IA que proteger.
   * Este endpoint es la mitad del par que sí depende del servidor; la otra mitad está
   * anotada en `Docs/PENDIENTES.md` §7. Comprobado el 2026-09-05 con
   * `grep -rn "ai-assistant" Frontend/src`: cero usos fuera de la propia carpeta.
   *
   * Se deja escrito aquí porque un comentario que promete un consumidor inexistente es
   * lo que hace creer que el trabajo está terminado.
   */
  @Get('estado')
  estado(): { disponible: boolean; motivo: string | null } {
    const disponible = this.deepseek.isConfigured();
    return {
      disponible,
      motivo: disponible ? null : 'Falta DEEPSEEK_API_KEY en la configuración del servidor.',
    };
  }

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
