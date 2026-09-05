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
  Put,
  UseGuards,
} from '@nestjs/common';
import { MemberRole } from '@prisma/client';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { RoleGuard } from '../../common/guards/role.guard';
import type { JwtPayload } from '../../common/interfaces/jwt-payload.interface';
import { CreateStepDto } from './dto/create-step.dto';
import { CreateTestDto } from './dto/create-test.dto';
import { UpdateStepDto } from './dto/update-step.dto';
import { UpdateTestDto } from './dto/update-test.dto';
import { ReorderStepsDto } from './dto/reorder-steps.dto';
import { StepResponseDto, TestResponseDto, TestVersionResponseDto } from './dto/test-response.dto';
import { TestStepsService } from './test-steps.service';
import { TestVersionsService } from './test-versions.service';
import { TestsService } from './tests.service';

@Controller()
@UseGuards(RoleGuard)
export class TestsController {
  constructor(
    private readonly testsService: TestsService,
    private readonly stepsService: TestStepsService,
    private readonly versionsService: TestVersionsService,
  ) {}

  // ── Tests ───────────────────────────────────────────────────────

  @Post('suites/:suiteId/tests')
  @Roles(MemberRole.EDITOR, MemberRole.ADMIN)
  createTest(
    @Param('suiteId') suiteId: string,
    @Body() dto: CreateTestDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TestResponseDto> {
    return this.testsService.create(suiteId, dto, user);
  }

  @Get('suites/:suiteId')
  findSuite(@Param('suiteId') suiteId: string, @CurrentUser() user: JwtPayload) {
    return this.testsService.findSuite(suiteId, user);
  }

  @Get('suites/:suiteId/tests')
  findAllTests(
    @Param('suiteId') suiteId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<TestResponseDto[]> {
    return this.testsService.findAll(suiteId, user);
  }

  @Get('tests/:id')
  findOneTest(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<TestResponseDto> {
    return this.testsService.findById(id, user);
  }

  @Patch('tests/:id')
  @Roles(MemberRole.EDITOR, MemberRole.ADMIN)
  updateTest(
    @Param('id') id: string,
    @Body() dto: UpdateTestDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<TestResponseDto> {
    return this.testsService.update(id, dto, user);
  }

  @Delete('tests/:id')
  @Roles(MemberRole.EDITOR, MemberRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  archiveTest(@Param('id') id: string, @CurrentUser() user: JwtPayload): Promise<void> {
    return this.testsService.archive(id, user);
  }

  // ── Steps ───────────────────────────────────────────────────────

  @Post('tests/:testId/steps')
  @Roles(MemberRole.EDITOR, MemberRole.ADMIN)
  createStep(
    @Param('testId') testId: string,
    @Body() dto: CreateStepDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<StepResponseDto> {
    return this.stepsService.create(testId, dto, user);
  }

  @Patch('tests/:testId/steps/:stepId')
  @Roles(MemberRole.EDITOR, MemberRole.ADMIN)
  updateStep(
    @Param('testId') testId: string,
    @Param('stepId') stepId: string,
    @Body() dto: UpdateStepDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<StepResponseDto> {
    return this.stepsService.update(testId, stepId, dto, user);
  }

  @Put('tests/:testId/steps/reorder')
  @Roles(MemberRole.EDITOR, MemberRole.ADMIN)
  reorderSteps(
    @Param('testId') testId: string,
    @Body() dto: ReorderStepsDto,
    @CurrentUser() user: JwtPayload,
  ): Promise<StepResponseDto[]> {
    return this.stepsService.reorder(testId, dto, user);
  }

  @Delete('tests/:testId/steps/:stepId')
  @Roles(MemberRole.EDITOR, MemberRole.ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  removeStep(
    @Param('testId') testId: string,
    @Param('stepId') stepId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<void> {
    return this.stepsService.remove(testId, stepId, user);
  }

  // ── Versions ────────────────────────────────────────────────────

  @Get('tests/:testId/versions')
  findVersions(
    @Param('testId') testId: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<TestVersionResponseDto[]> {
    return this.versionsService.findAll(testId, user);
  }

  @Get('tests/:testId/versions/:versionNumber')
  findVersion(
    @Param('testId') testId: string,
    @Param('versionNumber') versionNumber: string,
    @CurrentUser() user: JwtPayload,
  ): Promise<TestVersionResponseDto> {
    return this.versionsService.findOne(testId, parseInt(versionNumber, 10), user);
  }
}
