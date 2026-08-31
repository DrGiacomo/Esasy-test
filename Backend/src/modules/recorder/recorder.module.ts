import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module';
import { RecorderController } from './recorder.controller';
import { RecorderGateway } from './recorder.gateway';
import { RecorderService } from './recorder.service';

@Module({
  imports: [AuthModule],
  controllers: [RecorderController],
  providers: [RecorderService, RecorderGateway],
})
export class RecorderModule {}
