import { Module } from '@nestjs/common';
import { RecorderController } from './recorder.controller';
import { RecorderGateway } from './recorder.gateway';
import { RecorderService } from './recorder.service';

@Module({
  controllers: [RecorderController],
  providers: [RecorderService, RecorderGateway],
})
export class RecorderModule {}
