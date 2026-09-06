import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { configSchema } from './infrastructure/config/config.schema';
import { VaultModule } from './infrastructure/vault/vault.module';
import { PrismaModule } from './prisma/prisma.module';
import { FlujoModule } from './modules/flujo/flujo.module';
import { GlobalExceptionFilter } from './common/filters/global-exception.filter';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
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
    FlujoModule,
  ],
  providers: [
    { provide: APP_FILTER, useClass: GlobalExceptionFilter },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    // ── Aquí vivía RlsInterceptor, retirado el 2026-09-05 ──────────────────────────
    // Lanzaba `SET LOCAL app.current_org_id` en cada petición y NO funcionaba en ninguno
    // de sus tres pasos: sin `await` (iba a una conexión cualquiera del pool), con
    // `SET LOCAL` fuera de transacción (donde no hace nada) y con el orgId interpolado en
    // el SQL en vez de parametrizado. Ademas, las políticas que lo aprovecharían no están
    // aplicadas: `Backend/prisma/rls/001_rls_policies.sql` vive fuera de `migrations/` y
    // nadie lo ejecuta (comprobado: 0 políticas en la base).
    //
    // Se retira en vez de dejarlo porque un mecanismo de seguridad que no hace nada pero
    // parece que sí es PEOR que no tenerlo: hace revisar el resto del código con menos
    // cuidado. `M12` de LECCIONES.md.
    //
    // El aislamiento entre organizaciones lo hace hoy la capa de aplicación, filtrando por
    // `organizationId` en cada consulta — auditado el 2026-09-05 y correcto. Hacerlo
    // también en la base es un cambio de arquitectura, no un parche: está escrito con su
    // coste en `Docs/PENDIENTES.md` §9.
  ],
})
export class AppModule {}
