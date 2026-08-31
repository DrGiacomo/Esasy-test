import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { AiController } from './ai.controller';
import { AiAuditService } from './audit/ai-audit.service';
import { ChatService } from './operations/chat.service';
import { CodegenService } from './operations/codegen.service';
import { NlToFlowService } from './operations/nl-to-flow.service';
import { SelfHealingService } from './operations/self-healing.service';
import { AI_PROVIDER, AiProvider, VISION_PROVIDER } from './providers/ai-provider.interface';
import { DeepSeekProvider } from './providers/deepseek.provider';
import { GeminiProvider } from './providers/gemini.provider';

@Module({
  controllers: [AiController],
  providers: [
    DeepSeekProvider,
    GeminiProvider,
    { provide: AI_PROVIDER, useExisting: DeepSeekProvider },
    // Visión/multimodal: Gemini si hay GEMINI_API_KEY; si no, recae en DeepSeek (texto,
    // ignora imágenes) para que el self-healing siga funcionando sin configuración extra.
    {
      provide: VISION_PROVIDER,
      inject: [ConfigService, GeminiProvider, DeepSeekProvider],
      useFactory: (config: ConfigService, gemini: GeminiProvider, deepseek: DeepSeekProvider): AiProvider =>
        config.get<string>('GEMINI_API_KEY') ? gemini : deepseek,
    },
    AiAuditService,
    CodegenService,
    SelfHealingService,
    NlToFlowService,
    ChatService,
  ],
  exports: [CodegenService, SelfHealingService, NlToFlowService],
})
export class AiModule {}
