import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleDestroy,
  OnModuleInit,
} from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { ExecutionStatus } from '@prisma/client';
import { Queue } from 'bullmq';
import { JwtService } from '@nestjs/jwt';
import { createClient } from 'redis';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { PrismaService } from '../../prisma/prisma.service';
import { ExecutionResponseDto } from './dto/execution-response.dto';
import { TriggerExecutionDto } from './dto/trigger-execution.dto';
import { EXECUTION_QUEUE, ExecutionJobData } from './queues/execution.queue';

/** Canal por el que se avisa de una cancelacion. Uno solo para todas. */
export const CANAL_CANCELACION = 'execution:cancel';

@Injectable()
export class ExecutionsService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ExecutionsService.name);
  private publisher: ReturnType<typeof createClient> | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    @InjectQueue(EXECUTION_QUEUE) private readonly queue: Queue,
  ) {}

  /**
   * Pase para ver los artefactos de UNA ejecucion.
   *
   * Por que existe: `<video>` y `<img>` no pueden mandar cabeceras, asi que la credencial
   * tiene que viajar en la direccion. Hasta hoy viajaba el token de sesion completo, y una
   * direccion se guarda en muchos sitios -el log del servidor, el historial del navegador,
   * cualquier intermediario-. Quien lo encontrara tenia la cuenta entera.
   *
   * Este pase solo abre los artefactos de esta ejecucion y caduca en diez minutos. Si acaba
   * en un log, no sirve para nada mas.
   */
  async emitirPaseDeArtefactos(
    executionId: string,
    user: JwtPayload,
  ): Promise<{ token: string; expiraEnSegundos: number }> {
    await this.findById(executionId, user); // valida que la ejecucion es de su organizacion
    const expiraEnSegundos = 600;
    return {
      token: this.jwt.sign(
        { kind: 'artifact', executionId, orgId: user.orgId },
        { expiresIn: expiraEnSegundos },
      ),
      expiraEnSegundos,
    };
  }

  async onModuleInit(): Promise<void> {
    try {
      this.publisher = createClient({ url: process.env.REDIS_URL });
      await this.publisher.connect();
    } catch (err) {
      // Sin publicador, cancelar sigue funcionando: el worker lo vera en su sondeo. Es mas
      // lento, no incorrecto. Un aviso que no llega no puede tumbar la cancelacion.
      this.logger.warn(`Sin canal de cancelacion en vivo: ${String(err)}`);
      this.publisher = null;
    }
  }

  async onModuleDestroy(): Promise<void> {
    await this.publisher?.disconnect().catch(() => undefined);
  }

  async trigger(dto: TriggerExecutionDto, user: JwtPayload): Promise<ExecutionResponseDto> {
    const project = await this.prisma.project.findFirst({
      where: { id: dto.projectId, organizationId: user.orgId },
    });
    if (!project) throw new NotFoundException('Project not found');

    const execution = await this.prisma.execution.create({
      data: {
        projectId: dto.projectId,
        // Qué se pidió ejecutar. Hasta hoy solo viajaba en el job de la cola y se perdía al
        // terminar: la ejecución no recordaba si fue de una suite, de un test o del proyecto.
        suiteId: dto.suiteId ?? null,
        testId: dto.testId ?? null,
        triggeredBy: user.sub,
        status: ExecutionStatus.QUEUED,
      },
    });

    const jobData: ExecutionJobData = {
      executionId: execution.id,
      projectId: dto.projectId,
      orgId: user.orgId,
      suiteId: dto.suiteId,
      testId: dto.testId,
    };

    await this.queue.add('run', jobData, {
      jobId: execution.id, // determinista: permite removerlo al cancelar
      attempts: 2,
      backoff: { type: 'fixed', delay: 5000 },
    });

    return execution;
  }

  async findAllForOrg(user: JwtPayload): Promise<ExecutionResponseDto[]> {
    return this.prisma.execution.findMany({
      where: { project: { organizationId: user.orgId } },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async findAll(projectId: string, user: JwtPayload): Promise<ExecutionResponseDto[]> {
    const project = await this.prisma.project.findFirst({
      where: { id: projectId, organizationId: user.orgId },
    });
    if (!project) throw new NotFoundException('Project not found');

    return this.prisma.execution.findMany({
      where: { projectId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async findById(id: string, user: JwtPayload): Promise<ExecutionResponseDto> {
    const execution = await this.prisma.execution.findFirst({
      where: { id, project: { organizationId: user.orgId } },
    });
    if (!execution) throw new NotFoundException('Execution not found');
    return execution;
  }

  async findResults(id: string, user: JwtPayload) {
    await this.findById(id, user);
    return this.prisma.executionResult.findMany({
      where: { executionId: id },
      include: { test: { select: { id: true, name: true } } },
      orderBy: { createdAt: 'asc' },
    });
  }

  async cancel(id: string, user: JwtPayload): Promise<void> {
    const execution = await this.findById(id, user);

    const cancellable: ExecutionStatus[] = [
      ExecutionStatus.QUEUED,
      ExecutionStatus.PROVISIONING,
      ExecutionStatus.RUNNING,
      ExecutionStatus.COLLECTING,
    ];
    const deletable: ExecutionStatus[] = [
      ExecutionStatus.COMPLETED,
      ExecutionStatus.FAILED,
      ExecutionStatus.CANCELLED,
    ];

    if (cancellable.includes(execution.status)) {
      // 1) Marcar CANCELLED con update condicional atómico: si la ejecución terminó
      //    entre el findById y aquí, no re-marca una COMPLETED/FAILED como CANCELLED
      //    (antes pisaba su completedAt real). count === 0 = ya no era cancelable.
      await this.prisma.execution.updateMany({
        where: { id, status: { in: cancellable } },
        data: { status: ExecutionStatus.CANCELLED, completedAt: new Date() },
      });
      // 2) Quitar el job de la cola si aún no se ejecuta (si está activo, el worker ya lo verá).
      await this.queue.remove(id).catch(() => undefined);
      // 3) Avisar al worker AHORA, sin esperar a su sondeo. Es un atajo, no la garantia:
      //    Redis pub/sub no persiste, asi que si el worker esta reconectando el mensaje se
      //    pierde. Por eso el sondeo sigue existiendo — mas lento, pero no se pierde nada.
      await this.publisher
        ?.publish(CANAL_CANCELACION, id)
        .catch((err) => this.logger.warn(`No se pudo avisar de la cancelacion: ${String(err)}`));
    } else if (deletable.includes(execution.status)) {
      await this.prisma.execution.delete({ where: { id } });
      await this.queue.remove(id).catch(() => undefined);
    } else {
      throw new BadRequestException(`Cannot remove execution with status ${execution.status}`);
    }
  }
}
