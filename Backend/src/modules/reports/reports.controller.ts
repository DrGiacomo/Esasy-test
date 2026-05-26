import { Controller, Get, Param } from '@nestjs/common';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get(':executionId')
  getReport(
    @Param('executionId') executionId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return this.reportsService.getExecutionReport(executionId, user);
  }
}
