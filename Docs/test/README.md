# Registro de pruebas — Easy-test

Carpeta donde se registra **qué se probó, cómo y qué resultó**. Un archivo por prueba.

> **Esta carpeta es la tanda del `2026-06-27` y se conserva como registro histórico.**
> La verificación vigente, con los resultados del `2026-09-04`, está en
> [`../COMO-PROBAR.md`](../COMO-PROBAR.md) — nueve comprobaciones por HTTP más una ejecución
> real de punta a punta, escritas como paso a paso con lo que debe y lo que no debe pasar.

- **Fecha de la tanda:** 2026-06-27
- **Rama git:** `feat/secrets-executor-and-ci` (local). Remoto: `origin` → `https://github.com/DrGiacomo/Esasy-test.git`. ⚠️ La rama **no está pusheada** todavía.
- **Entorno:** Windows 11 · Node v24 · Docker Engine 29.5.3 (Docker Desktop) · Postgres 16 + Redis 7 (contenedores `e2e_postgres`/`e2e_redis`, healthy) · backend y worker corridos en local con `npm` contra la infra dockerizada.

## Índice

| # | Prueba | Tipo | Resultado |
|---|---|---|---|
| 01 | [Tests unitarios backend](01-backend-unit-tests.md) | Automática | ✅ 29/29 |
| 02 | [Builds y typecheck](02-builds-typecheck.md) | Automática | ✅ (tras arreglar 1 bug de tipos en frontend) |
| 03 | [Flujo de EJECUCIÓN E2E (live)](03-flujo-ejecucion-e2e.md) | En vivo (Docker) | ✅ COMPLETED — secretos `{{...}}` resueltos |
| 04 | [Flujo de GRABACIÓN (live)](04-flujo-grabacion.md) | En vivo (Docker) | ⚠️→✅ Encontrado y arreglado un 500; ahora funciona |
| 05 | [Hallazgos y qué falta](05-hallazgos.md) | Resumen | Ver lista |

## Cómo reproducir
1. Docker Desktop arriba.
2. `docker compose -f docker-compose.yml -f docker-compose.dev.yml up postgres redis -d`
3. `docker compose --profile build-images build executor recorder`
4. Backend: `cd Backend && npm run start:dev`
5. Worker (con red de contenedor para el executor):
   `CONTAINER_DATABASE_URL=postgresql://e2e_user:e2e_pass@e2e_postgres:5432/e2e_platform CONTAINER_REDIS_URL=redis://e2e_redis:6379 npm run start:worker:dev`
6. Scripts de prueba: `node Docs/test/_run-flow.mjs` y `node Docs/test/_run-recorder.mjs`.

> Nota: el flujo de grabación no simula interacción real del usuario (eventos CDP del browser); se valida el cableado infra + persistencia + conversión, no la captura de pasos.
