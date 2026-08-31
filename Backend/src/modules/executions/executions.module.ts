import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { AuthModule } from '../auth/auth.module';
import { ArtifactsController } from './artifacts.controller';
import { ExecutionsController } from './executions.controller';
import { ExecutionsGateway } from './executions.gateway';
import { ExecutionsService } from './executions.service';
import { EXECUTION_QUEUE } from './queues/execution.queue';

@Module({
  imports: [
    AuthModule,
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.get<string>('REDIS_URL') },
      }),
    }),
    BullModule.registerQueue({ name: EXECUTION_QUEUE }),
  ],
  controllers: [ExecutionsController, ArtifactsController],
  providers: [ExecutionsService, ExecutionsGateway],
  exports: [ExecutionsService],
})
export class ExecutionsModule {}
