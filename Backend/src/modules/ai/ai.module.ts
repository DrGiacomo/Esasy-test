import { Module } from '@nestjs/common';
import { AiController } from './ai.controller';
import { AiAuditService } from './audit/ai-audit.service';
import { ChatService } from './operations/chat.service';
import { CodegenService } from './operations/codegen.service';
import { NlToFlowService } from './operations/nl-to-flow.service';
import { SelfHealingService } from './operations/self-healing.service';
import { AI_PROVIDER } from './providers/ai-provider.interface';
import { DeepSeekProvider } from './providers/deepseek.provider';

@Module({
  controllers: [AiController],
  providers: [
    { provide: AI_PROVIDER, useClass: DeepSeekProvider },
    AiAuditService,
    CodegenService,
    SelfHealingService,
    NlToFlowService,
    ChatService,
  ],
  exports: [CodegenService, SelfHealingService, NlToFlowService],
})
export class AiModule {}
