import { Module } from '@nestjs/common';
import { TestStepsService } from './test-steps.service';
import { TestVersionsService } from './test-versions.service';
import { TestsController } from './tests.controller';
import { TestsService } from './tests.service';

@Module({
  controllers: [TestsController],
  providers: [TestsService, TestStepsService, TestVersionsService],
  exports: [TestsService, TestVersionsService],
})
export class TestsModule {}
