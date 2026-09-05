import { Inject, Injectable, NotFoundException } from '@nestjs/common';
import { AiOperationType } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { AiAuditService } from '../audit/ai-audit.service';
import { buildDocumentationPrompt } from '../prompts/documentation.prompt';
import type { DocumentableStep } from '../prompts/documentation.prompt';
import type { AiProvider } from '../providers/ai-provider.interface';
import { AI_PROVIDER } from '../providers/ai-provider.interface';

/**
 * Documentación automática de un test, en lenguaje llano.
 *
 * `AiOperationType.DOCUMENTATION` estaba en el enum de la base desde el diseño del
 * 2026-05-25 y nadie lo escribía nunca: era la capacidad «IA Contextual → documentación»
 * del §3 de PROJECT_CONTEXT.md, declarada y sin construir. Esto la construye.
 *
 * Es además el entregable que hace útil el modo SENCILLO: quien no programa no puede leer
 * un flujo de pasos, pero sí puede leer tres párrafos que le digan qué se está probando.
 */
@Injectable()
export class DocumentationService {
  constructor(
    @Inject(AI_PROVIDER) private readonly ai: AiProvider,
    private readonly prisma: PrismaService,
    private readonly audit: AiAuditService,
  ) {}

  async generate(testId: string, userId: string, orgId: string): Promise<{ documentation: string; documentedAt: Date }> {
    // El filtro por organización va en el mismo where, como en el resto de operaciones:
    // un testId de otra org tiene que ser indistinguible de uno que no existe.
    const test = await this.prisma.test.findFirst({
      where: { id: testId, suite: { project: { organizationId: orgId } } },
      include: {
        steps: { where: { isDisabled: false }, orderBy: { order: 'asc' } },
        suite: { select: { project: { select: { baseUrl: true } } } },
      },
    });
    if (!test) throw new NotFoundException('Test not found');

    // Los selectores NO se le pasan al modelo. No es filtrado de la salida: es que no
    // pueda citarlos porque nunca los vio. Ver el prompt.
    const steps: DocumentableStep[] = test.steps.map((s) => ({
      order: s.order,
      action: s.action,
      description: s.description,
      value: s.value,
    }));

    const messages = buildDocumentationPrompt(
      test.name,
      test.description,
      test.suite.project.baseUrl,
      steps,
    );

    let result;
    try {
      result = await this.ai.complete(messages);
      await this.audit.log(userId, AiOperationType.DOCUMENTATION, `Documentation for test: ${test.name}`, result, testId);
    } catch (err) {
      await this.audit.log(userId, AiOperationType.DOCUMENTATION, `Documentation for test: ${test.name}`, { error: String(err) }, testId);
      throw err;
    }

    const documentedAt = new Date();
    await this.prisma.test.update({
      where: { id: testId },
      data: { documentation: result.content, documentedAt },
    });

    return { documentation: result.content, documentedAt };
  }
}
