import { Inject, Injectable } from '@nestjs/common';
import { AiOperationType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiAuditService } from '../audit/ai-audit.service';
import { AI_PROVIDER } from '../providers/ai-provider.interface';
import type { AiMessage, AiProvider } from '../providers/ai-provider.interface';

@Injectable()
export class ChatService {
  constructor(
    @Inject(AI_PROVIDER) private readonly ai: AiProvider,
    private readonly audit: AiAuditService,
    private readonly prisma: PrismaService,
  ) {}

  async chat(
    messages: AiMessage[],
    userId: string,
    orgId: string,
    relatedTestId?: string,
  ): Promise<string> {
    // `relatedTestId` viene directo del cliente (a diferencia de codegen/heal, que ya
    // verifican el test contra la org). Sin validar: un id de otra org quedaba
    // referenciado en el audit log, y un id inexistente rompía la FK → 500 tras pagar
    // la llamada a la IA. Se ignora si no pertenece a la org del usuario.
    const validTestId = relatedTestId
      ? (
          await this.prisma.test.findFirst({
            where: { id: relatedTestId, suite: { project: { organizationId: orgId } } },
            select: { id: true },
          })
        )?.id
      : undefined;

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
      await this.audit.log(userId, AiOperationType.CHAT, 'Chat message', result, validTestId);
    } catch (err) {
      await this.audit.log(
        userId,
        AiOperationType.CHAT,
        'Chat message',
        { error: String(err) },
        validTestId,
      );
      throw err;
    }

    return result.content;
  }
}
