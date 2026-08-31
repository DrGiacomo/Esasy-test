-- =============================================================================
-- RLS — Rol de aplicación restringido (sin superuser, sin BYPASSRLS)
-- =============================================================================
-- Las políticas RLS NO aplican a superusuarios ni a roles con BYPASSRLS.
-- La app/worker/executor deben conectarse con ESTE rol para que el aislamiento
-- multi-tenant se cumpla a nivel de base de datos.
--
-- ⚠️ Cambia la contraseña antes de producción:
--     ALTER ROLE e2e_app PASSWORD 'una-contraseña-fuerte';
-- y actualiza DATABASE_URL: postgresql://e2e_app:...@host:5432/e2e_platform
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'e2e_app') THEN
    CREATE ROLE e2e_app LOGIN PASSWORD 'e2e_app_pass';
  END IF;
END
$$;

-- Asegura que NO tenga privilegios que salten RLS.
ALTER ROLE e2e_app NOSUPERUSER NOBYPASSRLS;

GRANT USAGE ON SCHEMA public TO e2e_app;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO e2e_app;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO e2e_app;
GRANT EXECUTE ON FUNCTION app_current_org() TO e2e_app;

-- Tablas/secuencias futuras (próximas migraciones) heredan los permisos.
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO e2e_app;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO e2e_app;
