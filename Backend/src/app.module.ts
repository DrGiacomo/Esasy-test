import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD, APP_INTERCEPTOR } from '@nestjs/core';
import { configSchema } from './infrastructure/config/config.schema';
import { VaultModule } from './infrastructure/vault/vault.module';
import { PrismaModule } from './prisma/prisma.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RlsInterceptor } from './common/interceptors/rls.interceptor';
import { AuthModule } from './modules/auth/auth.module';
import { OrganizationsModule } from './modules/organizations/organizations.module';
import { ProjectsModule } from './modules/projects/projects.module';
import { TestSuitesModule } from './modules/test-suites/test-suites.module';
import { TestsModule } from './modules/tests/tests.module';
import { ExecutionsModule } from './modules/executions/executions.module';
import { RecorderModule } from './modules/recorder/recorder.module';
import { AiModule } from './modules/ai/ai.module';
import { SecretsModule } from './modules/secrets/secrets.module';
import { GitModule } from './modules/git/git.module';
import { ReportsModule } from './modules/reports/reports.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: configSchema,
      validationOptions: { abortEarly: true },
    }),
    PrismaModule,
    VaultModule,
    AuthModule,
    OrganizationsModule,
    ProjectsModule,
    TestSuitesModule,
    TestsModule,
    ExecutionsModule,
    RecorderModule,
    AiModule,
    SecretsModule,
    GitModule,
    ReportsModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_INTERCEPTOR, useClass: RlsInterceptor },
  ],
})
export class AppModule {}
