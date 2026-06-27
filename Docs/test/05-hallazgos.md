# 05 — Hallazgos y qué falta (tanda 2026-06-27)

Resumen de lo que **vi** al probar el flujo, ordenado por severidad. Distingue lo ya arreglado de lo pendiente.

## 🛠️ Arreglado en esta tanda
1. **`POST /recorder/sessions` daba 500** (estructura circular `Timeout`). El flujo de grabación estaba **roto de punta a punta**. Arreglado proyectando un DTO serializable. → [04](04-flujo-grabacion.md)
2. **Frontend no compilaba en `master`** (error de tipos en `TestDetailPage.tsx`). Arreglado. → [02](02-builds-typecheck.md)

## 🔴 Pendiente — configuración que rompe la ejecución real
3. **`.env` / `.env.example` no definen `CONTAINER_DATABASE_URL` ni `CONTAINER_REDIS_URL`.** Con el setup de dev (backend/worker por `npm`, infra en Docker), el contenedor executor recibe `localhost` y **no puede conectar** a Postgres/Redis. La ejecución solo funciona si se aportan esas vars (apuntando a `e2e_postgres`/`e2e_redis` en la red `easytest_e2e-net`).
   - **Acción:** ✅ añadidas a `.env.example` con comentario en esta tanda. Falta replicarlas en el `.env` real de cada entorno y mencionarlo en la guía de arranque.

## 🟠 Pendiente — incoherencias de contrato
4. **Acción `assert` aceptada por la API pero no implementada por el executor.** `CreateStepDto` permite `action: 'assert'`, pero `executor.js` solo maneja `assert_visible` / `assert_text` (y estos **no** están en la lista del DTO). Un paso `assert` creado por API haría que el executor lance `Unknown action: assert`. Además la UI/recorder no pueden crear aserciones reales vía API.
   - **Acción:** unificar el vocabulario de acciones entre `CreateStepDto`, el executor y el recorder.

## 🟡 Confirmado, ya en el roadmap
5. **`screenshotUrl` siempre `null` con video activo** (perfeccionar 2.1): el `artifact-collector` busca `${testId}_final.png`, que solo se genera con `RECORD_VIDEO=false`.
6. **Cobertura de tests:** worker (ciclo de vida del contenedor), recorder y frontend siguen sin tests.

## ✅ Lo que SÍ funciona (verificado en vivo)
- Registro/login, multi-tenant (JWT), CRUD de proyecto/suite/test/pasos/secretos.
- Encolado BullMQ → worker → contenedor executor → Playwright → resultados + video.
- **Inyección y resolución de secretos `{{NOMBRE}}`** end-to-end.
- Provisión del contenedor recorder, persistencia de grabación y conversión a test (tras el fix #1).

## Sugerencia de prioridad
1. (#3) Documentar/añadir `CONTAINER_*` — es trivial y desbloquea la ejecución real fuera de esta sesión.
2. (#4) Unificar acciones `assert*`.
3. Cubrir con tests lo recién tocado (recorder controller, processor).
