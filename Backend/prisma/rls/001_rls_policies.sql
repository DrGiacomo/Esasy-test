-- =============================================================================
-- RLS — Políticas de aislamiento multi-tenant (aplicar DESPUÉS de prisma migrate)
-- =============================================================================
-- Idempotente: se puede re-ejecutar sin error.
-- La app debe fijar el contexto por request/sesión:
--     SELECT set_config('app.current_org_id', '<orgId>', true);   -- por transacción
--     SET    app.current_org_id = '<orgId>';                       -- por sesión
-- El rol de la app (ver 002_app_role.sql) NO debe ser superuser ni BYPASSRLS,
-- de lo contrario las políticas se ignoran.
-- =============================================================================

-- Org actual del contexto. `true` = missing_ok → NULL si no se fijó (no matchea nada).
CREATE OR REPLACE FUNCTION app_current_org() RETURNS text AS $$
  SELECT current_setting('app.current_org_id', true);
$$ LANGUAGE sql STABLE;

-- ---------------------------------------------------------------------------
-- Tablas con organization_id / orgId DIRECTO
-- ---------------------------------------------------------------------------
ALTER TABLE "projects"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "secrets"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "git_integrations" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "recordings"       ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS org_isolation ON "projects";
CREATE POLICY org_isolation ON "projects"
  USING ("organizationId" = app_current_org())
  WITH CHECK ("organizationId" = app_current_org());

DROP POLICY IF EXISTS org_isolation ON "secrets";
CREATE POLICY org_isolation ON "secrets"
  USING ("organizationId" = app_current_org())
  WITH CHECK ("organizationId" = app_current_org());

DROP POLICY IF EXISTS org_isolation ON "git_integrations";
CREATE POLICY org_isolation ON "git_integrations"
  USING ("organizationId" = app_current_org())
  WITH CHECK ("organizationId" = app_current_org());

DROP POLICY IF EXISTS org_isolation ON "recordings";
CREATE POLICY org_isolation ON "recordings"
  USING ("orgId" = app_current_org())
  WITH CHECK ("orgId" = app_current_org());

-- ---------------------------------------------------------------------------
-- Tablas con org_id INDIRECTO (vía relaciones hasta projects.organizationId)
-- ---------------------------------------------------------------------------
ALTER TABLE "test_suites"           ENABLE ROW LEVEL SECURITY;
ALTER TABLE "tests"                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE "test_steps"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "test_versions"         ENABLE ROW LEVEL SECURITY;
ALTER TABLE "executions"            ENABLE ROW LEVEL SECURITY;
ALTER TABLE "execution_results"     ENABLE ROW LEVEL SECURITY;
ALTER TABLE "step_results"          ENABLE ROW LEVEL SECURITY;
ALTER TABLE "selector_healing_logs" ENABLE ROW LEVEL SECURITY;

-- test_suites → projects
DROP POLICY IF EXISTS org_isolation ON "test_suites";
CREATE POLICY org_isolation ON "test_suites"
  USING (EXISTS (SELECT 1 FROM "projects" p
                 WHERE p.id = "test_suites"."projectId" AND p."organizationId" = app_current_org()))
  WITH CHECK (EXISTS (SELECT 1 FROM "projects" p
                 WHERE p.id = "test_suites"."projectId" AND p."organizationId" = app_current_org()));

-- tests → test_suites → projects
DROP POLICY IF EXISTS org_isolation ON "tests";
CREATE POLICY org_isolation ON "tests"
  USING (EXISTS (SELECT 1 FROM "test_suites" s JOIN "projects" p ON p.id = s."projectId"
                 WHERE s.id = "tests"."suiteId" AND p."organizationId" = app_current_org()))
  WITH CHECK (EXISTS (SELECT 1 FROM "test_suites" s JOIN "projects" p ON p.id = s."projectId"
                 WHERE s.id = "tests"."suiteId" AND p."organizationId" = app_current_org()));

-- test_steps → tests → ...
DROP POLICY IF EXISTS org_isolation ON "test_steps";
CREATE POLICY org_isolation ON "test_steps"
  USING (EXISTS (SELECT 1 FROM "tests" t JOIN "test_suites" s ON s.id = t."suiteId" JOIN "projects" p ON p.id = s."projectId"
                 WHERE t.id = "test_steps"."testId" AND p."organizationId" = app_current_org()))
  WITH CHECK (EXISTS (SELECT 1 FROM "tests" t JOIN "test_suites" s ON s.id = t."suiteId" JOIN "projects" p ON p.id = s."projectId"
                 WHERE t.id = "test_steps"."testId" AND p."organizationId" = app_current_org()));

-- test_versions → tests → ...
DROP POLICY IF EXISTS org_isolation ON "test_versions";
CREATE POLICY org_isolation ON "test_versions"
  USING (EXISTS (SELECT 1 FROM "tests" t JOIN "test_suites" s ON s.id = t."suiteId" JOIN "projects" p ON p.id = s."projectId"
                 WHERE t.id = "test_versions"."testId" AND p."organizationId" = app_current_org()))
  WITH CHECK (EXISTS (SELECT 1 FROM "tests" t JOIN "test_suites" s ON s.id = t."suiteId" JOIN "projects" p ON p.id = s."projectId"
                 WHERE t.id = "test_versions"."testId" AND p."organizationId" = app_current_org()));

-- executions → projects
DROP POLICY IF EXISTS org_isolation ON "executions";
CREATE POLICY org_isolation ON "executions"
  USING (EXISTS (SELECT 1 FROM "projects" p
                 WHERE p.id = "executions"."projectId" AND p."organizationId" = app_current_org()))
  WITH CHECK (EXISTS (SELECT 1 FROM "projects" p
                 WHERE p.id = "executions"."projectId" AND p."organizationId" = app_current_org()));

-- execution_results → executions → projects
DROP POLICY IF EXISTS org_isolation ON "execution_results";
CREATE POLICY org_isolation ON "execution_results"
  USING (EXISTS (SELECT 1 FROM "executions" e JOIN "projects" p ON p.id = e."projectId"
                 WHERE e.id = "execution_results"."executionId" AND p."organizationId" = app_current_org()))
  WITH CHECK (EXISTS (SELECT 1 FROM "executions" e JOIN "projects" p ON p.id = e."projectId"
                 WHERE e.id = "execution_results"."executionId" AND p."organizationId" = app_current_org()));

-- step_results → execution_results → executions → projects
DROP POLICY IF EXISTS org_isolation ON "step_results";
CREATE POLICY org_isolation ON "step_results"
  USING (EXISTS (SELECT 1 FROM "execution_results" er JOIN "executions" e ON e.id = er."executionId" JOIN "projects" p ON p.id = e."projectId"
                 WHERE er.id = "step_results"."executionResultId" AND p."organizationId" = app_current_org()))
  WITH CHECK (EXISTS (SELECT 1 FROM "execution_results" er JOIN "executions" e ON e.id = er."executionId" JOIN "projects" p ON p.id = e."projectId"
                 WHERE er.id = "step_results"."executionResultId" AND p."organizationId" = app_current_org()));

-- selector_healing_logs → tests → ...
DROP POLICY IF EXISTS org_isolation ON "selector_healing_logs";
CREATE POLICY org_isolation ON "selector_healing_logs"
  USING (EXISTS (SELECT 1 FROM "tests" t JOIN "test_suites" s ON s.id = t."suiteId" JOIN "projects" p ON p.id = s."projectId"
                 WHERE t.id = "selector_healing_logs"."testId" AND p."organizationId" = app_current_org()))
  WITH CHECK (EXISTS (SELECT 1 FROM "tests" t JOIN "test_suites" s ON s.id = t."suiteId" JOIN "projects" p ON p.id = s."projectId"
                 WHERE t.id = "selector_healing_logs"."testId" AND p."organizationId" = app_current_org()));

-- =============================================================================
-- Notas
-- - users, refresh_tokens, organizations, memberships: SIN RLS (identidad/onboarding,
--   se acceden antes de tener contexto de org; protegidas a nivel de app).
-- - ai_audit_logs: SIN RLS (audit append-only, scope por userId; relatedTestId opcional).
-- =============================================================================
