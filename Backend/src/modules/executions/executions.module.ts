import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { ConfigService } from '@nestjs/config';
import { ExecutionsController } from './executions.controller';
import { ExecutionsGateway } from './executions.gateway';
import { ExecutionsService } from './executions.service';
import { EXECUTION_QUEUE } from './queues/execution.queue';

@Module({
  imports: [
    BullModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        connection: { url: config.get<string>('REDIS_URL') },
      }),
    }),
    BullModule.registerQueue({ name: EXECUTION_QUEUE }),
  ],
  controllers: [ExecutionsController],
  providers: [ExecutionsService, ExecutionsGateway],
  exports: [ExecutionsService],
})
export class ExecutionsModule {}
