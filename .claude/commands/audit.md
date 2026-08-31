Analiza exhaustivamente el código de la plataforma Easy-test (E2E automation con IA). Backend NestJS, workers BullMQ, containers Docker (executor/recorder), proveedor de IA DeepSeek y frontend React.

Archivos clave a revisar:
- **Backend / ejecuciones**: `Backend/src/modules/executions/executions.service.ts`, `Backend/src/modules/executions/executions.gateway.ts`
- **Worker**: `Backend/src/workers/execution/execution.processor.ts`, `Backend/src/workers/execution/docker.service.ts`, `Backend/src/workers/execution/artifact-collector.service.ts`
- **Recorder**: `Backend/src/modules/recorder/recorder.service.ts`, `Backend/src/modules/recorder/recorder.gateway.ts`, `recorder/src/recorder.js`
- **Executor (container)**: `executor/src/executor.js`
- **IA**: `Backend/src/modules/ai/operations/self-healing.service.ts`, `nl-to-flow.service.ts`, `codegen.service.ts`, `chat.service.ts`, `Backend/src/modules/ai/providers/deepseek.provider.ts`
- **Tests / suites**: `Backend/src/modules/tests/tests.service.ts`, `test-steps.service.ts`, `test-versions.service.ts`, `Backend/src/modules/test-suites/test-suites.service.ts`
- **Auth / multi-tenant**: `Backend/src/modules/auth/auth.service.ts`, `Backend/src/modules/organizations/memberships.service.ts`, `Backend/src/modules/secrets/secrets.service.ts`

Lee cada archivo completo antes de emitir juicio. Busca ÚNICAMENTE problemas reales — no sugieras refactors estéticos ni mejoras de estilo.

Categorías a revisar:

**CRÍTICO** — puede causar datos incorrectos, cuelgue, fuga entre tenants o pérdida de información:
- Race conditions: concurrencia del worker BullMQ, paralelismo de containers (MAX_PARALLEL), reconexión WebSocket, pub/sub Redis (`execution:<id>:events`), re-suscripción al room tras reconectar
- Fuga multi-tenant: queries sin filtrar por `organizationId`/`projectId`, falta de guard de ownership al leer ejecuciones, tests, grabaciones o secretos de otra organización
- Self-Healing que aplique cambios automáticamente en vez de quedar en `PENDING_APPROVAL` (NUNCA debe auto-aplicar)
- Excepciones silenciadas que ocultan fallos reales de la API DeepSeek, Prisma, Docker o Redis
- Errores P2025 / registros eliminados mientras el job corre: worker o gateway que crashea al desaparecer la ejecución
- Manejo de secretos: secretos logueados, expuestos en respuestas API o inyectados sin cifrar en el container del executor

**ALTO** — afecta directamente la fiabilidad de la ejecución o la calidad de la IA:
- Containers (executor/recorder) que quedan colgados: timeouts ausentes o mal aplicados (ej. los 15s para guardar video), containers no eliminados tras fallo
- Estados de ejecución inconsistentes (QUEUED/PROVISIONING/RUNNING/COLLECTING/terminales) que pueden quedar atascados o transicionar mal
- Mapeo grabación→test que pierda pasos, duplique selectores o genere selectores frágiles
- Prompts/parsing de DeepSeek (nl-to-flow, codegen, self-healing) que confíen en JSON sin validar y rompan ante respuesta malformada
- Cancelar/eliminar ejecución (hard delete) que deje huérfanos: artifacts, jobs en cola, rooms WebSocket o containers vivos
- JWT/refresh token: validación incompleta, refresh que no rota, expiración mal calculada

**MEDIO** — degradación silenciosa o comportamiento inesperado:
- Variables inicializadas pero nunca usadas; imports sin usar
- Fallbacks (polling cada 3s, reconexión WS) que enmascaran el error real en vez de reportarlo en la UI
- Código muerto: endpoints, servicios o jobs definidos pero nunca llamados
- Promesas sin await o sin catch que pierden errores
- Suscripciones WebSocket / listeners de socket.io no liberados (memory leaks)

**BAJO** — inconsistencias menores que pueden confundir:
- Comentarios que contradicen el código actual
- Logs que muestran información incorrecta o desactualizada (estados, IDs)
- Nombres de variables, DTOs o constantes que no reflejan lo que contienen
- Inconsistencias entre el schema Prisma y los tipos usados en el servicio

Por cada hallazgo entrega: `NIVEL | archivo:línea | descripción concisa del problema`.
Al final, un resumen de cuántos hallazgos por nivel.
No incluyas sugerencias de fix — solo el diagnóstico.
