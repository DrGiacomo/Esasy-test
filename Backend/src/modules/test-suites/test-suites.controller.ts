import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { MemberRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleGuard } from '../../common/guards/role.guard';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { CreateTestSuiteDto } from './dto/create-test-suite.dto';
import { UpdateTestSuiteDto } from './dto/update-test-suite.dto';
import { TestSuiteResponseDto } from './dto/test-suite-response.dto';
import { TestSuitesService } from './test-suites.service';

@Controller('projects/:projectId/suites')
@UseGuards(RoleGuard)
export class TestSuitesController {
  constructor(private readonly testSuitesService: TestSuitesService) {}

  @Post()
  @Roles(MemberRole.EDITOR, MemberRole.ADMIN)
  create(
    @Param('projectId') projectId: string,
    @Body() dto: CreateTestSuiteDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TestSuiteResponseDto> {
    return this.testSuitesService.create(projectId, dto, user);
  }

  @Get()
  findAll(
    @Param('projectId') projectId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<TestSuiteResponseDto[]> {
    return this.testSuitesService.findAll(projectId, user);
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<TestSuiteResponseDto> {
    return this.testSuitesService.findById(id, user);
  }

  @Patch(':id')
  @Roles(MemberRole.EDITOR, MemberRole.ADMIN)
  update(
    @Param('id') id: string,
    @Body() dto: UpdateTestSuiteDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TestSuiteResponseDto> {
    return this.testSuitesService.update(id, dto, user);
  }

  @Delete(':id')
  @Roles(MemberRole.EDITOR, MemberRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  archive(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<void> {
    return this.testSuitesService.archive(id, user);
  }
}
