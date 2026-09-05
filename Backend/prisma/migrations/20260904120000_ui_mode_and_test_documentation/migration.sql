-- Fase 4 · Producto usable. Dos cambios en una sola migración: aplicarla es deuda
-- operativa en cada entorno y no se paga dos veces.

-- 1) Modo de interfaz por usuario. Son DOS y solo dos, y el rol no influye.
--    Todo el mundo arranca en SENCILLO; pasar a COMPLEJO es siempre decisión del
--    propio usuario. Es el §2 de Docs/PROJECT_CONTEXT.md, declarado el 2026-05-25
--    y sin construir hasta hoy.
CREATE TYPE "UiMode" AS ENUM ('SENCILLO', 'COMPLEJO');

ALTER TABLE "users" ADD COLUMN "uiMode" "UiMode" NOT NULL DEFAULT 'SENCILLO';

-- 2) Documentación en lenguaje llano generada por IA, espejo de "generatedCode".
--    Nullable: los tests existentes no tienen ninguna, y se genera a petición.
--    "documentedAt" existe para poder saber si caducó al cambiar los pasos.
ALTER TABLE "tests" ADD COLUMN "documentation" TEXT;
ALTER TABLE "tests" ADD COLUMN "documentedAt" TIMESTAMP(3);
