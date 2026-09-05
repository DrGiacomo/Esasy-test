import { Controller, Get, Header, Param, Req } from '@nestjs/common';
import type { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { ReportsService } from './reports.service';

@Controller('reports')
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get(':executionId')
  getReport(@Param('executionId') executionId: string, @CurrentUser() user: JwtPayload) {
    return this.reportsService.getExecutionReport(executionId, user);
  }

  /**
   * El mismo informe en HTML, para guardar o reenviar. Las capturas van embebidas, asi
   * que se ve bien mucho despues de que caduque la sesion con la que se descargo.
   */
  @Get(':executionId/html')
  @Header('Content-Type', 'text/html; charset=utf-8')
  getReportHtml(
    @Param('executionId') executionId: string,
    @CurrentUser() user: JwtPayload,
    @Req() req: Request,
  ): Promise<string> {
    const token = req.headers.authorization?.replace(/^Bearer\s+/i, '');
    return this.reportsService.getExecutionReportHtml(executionId, user, token);
  }
}
