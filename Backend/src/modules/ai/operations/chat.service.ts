import { Inject, Injectable } from '@nestjs/common';
import { AiOperationType } from '@prisma/client';
import { AiAuditService } from '../audit/ai-audit.service';
import { AI_PROVIDER } from '../providers/ai-provider.interface';
import type { AiMessage, AiProvider } from '../providers/ai-provider.interface';

@Injectable()
export class ChatService {
  constructor(
    @Inject(AI_PROVIDER) private readonly ai: AiProvider,
    private readonly audit: AiAuditService,
  ) {}

  async chat(
    messages: AiMessage[],
    userId: string,
    relatedTestId?: string,
  ): Promise<string> {
    const withSystem: AiMessage[] = [
      {
        role: 'system',
        content: `You are a helpful QA engineering assistant.
You help users understand Playwright, E2E testing concepts, and how to use this testing platform.
Be concise and practical.`,
      },
      ...messages,
    ];

    let result;
    try {
      result = await this.ai.complete(withSystem);
      await this.audit.log(userId, AiOperationType.CHAT, 'Chat message', result, relatedTestId);
    } catch (err) {
      await this.audit.log(userId, AiOperationType.CHAT, 'Chat message', { error: String(err) }, relatedTestId);
      throw err;
    }

    return result.content;
  }
}
