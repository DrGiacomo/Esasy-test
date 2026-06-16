# Oportunidades de mejora — Easy-test

- **Fecha de análisis:** 2026-06-15
- **Alcance:** funcionalidades principales del flujo grabar → convertir → ejecutar → ver resultados.
- **Comando origen:** `/perfeccionar` (`.claude/commands/perfeccionar.md`)
- **Criterio:** mejora medible · sin sacrificar funcionalidad · sin cambiar el stack.

> Distinto del audit: aquí no son bugs, son oportunidades de mejora con impacto estimado.

---

## Motor de ejecución
- **Job timeout + idempotencia BullMQ** — *(Impacto: alto.)* **✅ Implementado en el bloque 2 (2026-06-15):** `jobId` determinista, `deleteMany`+`createMany` idempotentes, timeout `EXECUTION_TIMEOUT_MS`, cancelación cooperativa.
- **Recoger artefactos coherentes** — `artifact-collector.service.ts:19` busca `${testId}_final.png` que el executor solo genera con `RECORD_VIDEO=false` (`executor.js:139`). Con video activo `screenshotUrl` siempre es null. *(Impacto: medio.)*
- **MAX_PARALLEL/RECORD_VIDEO por proyecto** — `execution.processor.ts:48-54` no propaga estas vars; el executor usa defaults fijos. Exponerlas por proyecto da control de coste/paralelismo. *(Impacto: medio.)*

## Grabación y conversión
- **Mejor calidad de selectores** — `recorder.service.ts:152-154` usa el CSS crudo capturado. Priorizar `data-testid`/rol/texto reduce tests frágiles y baja la dependencia del self-healing. *(Impacto: alto.)*
- **Persistir grabación incrementalmente** — `recorder.service.ts:87-92` acumula pasos solo en memoria; si el backend cae antes de `stop()`, se pierde todo. Flush periódico a BD. *(Impacto: medio.)*

## IA y self-healing
- **Forzar y validar salida JSON** — *(Impacto: alto.)* **✅ Implementado en el bloque 3 (2026-06-15):** `response_format: json_object` en el provider, helper `parseAiJson` (tolera fences) y validación de campos en nl-to-flow y self-healing.
- **Reintentos/backoff en el provider** — `deepseek.provider.ts:20` hace un POST único; un 429/5xx tumba la operación. Retry con backoff exponencial (axios ya está). *(Impacto: medio.)*
- **Umbral de confianza en self-healing** — `self-healing.service.ts:47-58` crea la propuesta sin importar `confidence`. Filtrar/ordenar por `confidenceAfter`. *(Impacto: medio.)*

## Tiempo real y estado
- **Heartbeat de progreso por paso** — el executor publica `result:started`/`result:completed` (`executor.js:111,183`) pero no progreso intra-test. Emitir `step:passed` por paso. *(Impacto: alto.)*
- **Snapshot inicial al suscribirse** — `executions.gateway.ts` hace join pero no envía estado actual; un cliente que conecta tarde no ve nada hasta el próximo evento. *(Impacto: medio.)*

## Multi-tenant y seguridad
- **Auth WS + verificación de propiedad** — *(Impacto: alto.)* **✅ Implementado en el bloque 1 (2026-06-15):** JWT en handleConnection de ambos gateways, verificación de org antes de join, token de sesión para el contenedor recorder.
- **Cablear secretos al executor** — `secrets.service.ts:52` existe pero nunca se usa; inyectar secretos desencriptados como env del contenedor. *(Impacto: alto.)*

## UI y experiencia
- **Distinguir estados terminales** — con `assert_text` sin comparar y pasos no ejecutados sin fila, la UI no puede mostrar "saltado" vs "fallido". *(Impacto: medio.)*
- **Banner de error accionable** — varios `catch` solo loguean (`recorder.service.ts:217`, `deepseek.provider.ts`). Propagar mensaje tipado al frontend. *(Impacto: medio.)*

---

## Orden recomendado de implementación
1. **Auth WS + filtro de org en IA** (multi-tenant). → **✅ Hecho 2026-06-15.**
2. **Ciclo de vida de contenedores en el worker** (cleanup, timeout, idempotencia) + `cancel()` real.
3. **`assert_text` real + JSON forzado/validado en IA.**
