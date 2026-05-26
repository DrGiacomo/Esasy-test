import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { BullModule } from '@nestjs/bullmq';
import { configSchema } from '../infrastructure/config/config.schema';
import { PrismaModule } from '../prisma/prisma.module';
import { VaultModule } from '../infrastructure/vault/vault.module';
import { EXECUTION_QUEUE } from '../modules/executions/queues/execution.queue';
import { ExecutionProcessor } from './execution/execution.processor';
import { DockerService } from './execution/docker.service';
import { ArtifactCollectorService } from './execution/artifact-collector.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: configSchema,
      validationOptions: { abortEarly: true },
    }),
    PrismaModule,
    VaultModule,
    BullModule.forRootAsync({
      useFactory: () => ({
        connection: { url: process.env.REDIS_URL },
      }),
    }),
    BullModule.registerQueue({ name: EXECUTION_QUEUE }),
  ],
  providers: [ExecutionProcessor, DockerService, ArtifactCollectorService],
})
export class WorkerModule {}
