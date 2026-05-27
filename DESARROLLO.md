# Registro de Desarrollo — Easy Test

Plataforma de automatización E2E con IA: grabación de sesiones, conversión a tests y ejecución en contenedores Docker.

---

## 1. Grabador de sesiones (Recorder)

### Problema: frames en blanco
El stream de video del grabador mostraba imágenes completamente blancas.

**Causa:** `page.goto(TARGET_URL)` estaba dentro del handler `socket.on('connect')`, por lo que el intervalo de capturas de frames arrancaba sobre una página vacía antes de que el navegador terminara de navegar.

**Solución:** Navegar a `TARGET_URL` inmediatamente al iniciar el proceso, y comenzar el stream de frames solo después de que el WebSocket emita `connect`.

```js
// recorder.js
await page.goto(TARGET_URL, { waitUntil: 'domcontentloaded' });
socket.on('connect', () => {
  startFrameStream(); // solo aquí
});
```

---

### Problema: race condition en session:join
El frontend emitía `session:join` sincrónicamente tras llamar a `socket.connect()`, antes de que el socket estuviera realmente conectado.

**Solución:** Emitir `session:join` dentro del handler `connect`, con fallback si ya estaba conectado.

```ts
recorderSocket.connect();
if (recorderSocket.connected) { joinSession(); }
recorderSocket.on('connect', joinSession);
```

---

### Problema: el navegador remoto no respondía a clicks ni teclado
El componente `RemoteBrowserFrame` era una `<img>` estática sin handlers de eventos.

**Solución:** Reescritura completa del componente con:
- Mapeo de coordenadas de pantalla al viewport remoto (1280×720)
- Handler de click → emite `{ type: 'click', x, y }`
- Handler de teclado → teclas especiales emiten `press`, caracteres emiten `type`
- `tabIndex` y `cursor: crosshair` para feedback visual

---

## 2. Grabaciones persistidas

### Problema: las grabaciones no se guardaban
Al detener una sesión, los pasos capturados no se almacenaban en ningún lugar.

**Solución:**
- Nuevo modelo `Recording` en Prisma con `steps: Json`, `projectId`, `orgId`, etc.
- `RecorderService.addStep()` acumula pasos en memoria durante la sesión
- `RecorderService.stop()` llama a `saveRecording()` antes de destruir el contenedor
- Endpoints nuevos: `GET /recorder/recordings`, `GET /recorder/recordings/:id`

---

## 3. Conversión de grabación a test

### Problema: no había forma de convertir una grabación en un test ejecutable

**Solución:** Endpoint `POST /recorder/recordings/:id/convert` que:
1. Colapsa eventos `type` consecutivos en un solo `fill`
2. Deduplica navegaciones al mismo URL
3. Mapea cada tipo de evento al schema de `TestStep` (action, selector, value)
4. Crea `Test` + `TestStep[]` en una transacción Prisma

### Errores TypeScript en `convertToTest`
- `semanticModel: mappedSteps` → requería `as unknown as Prisma.InputJsonValue`
- `rec.steps as CapturedStep[]` → requería `as unknown as CapturedStep[]`
- Spread de tipo `object` en `data` → se resolvió desestructurando explícitamente

---

## 4. UI de grabaciones

### Nuevo: página de grabaciones
- `RecordingsPage`: lista grabaciones con pasos colapsables y botón "Convertir"
- `ConvertModal`: selecciona proyecto → suite (carga dinámica), ingresa nombre, llama al endpoint
- Tab "Grabaciones" integrada en `ProjectDetailPage` filtrada por proyecto
- Ítem "Grabaciones" agregado al sidebar

---

## 5. Ejecución de tests en Docker

### Problema: el executor fallaba silenciosamente (exit code 1, sin logs)
El contenedor se creaba y destruía en ~1 segundo. `errorMessage` en DB quedaba null.

**Diagnóstico:** Se corrió el executor manualmente con `docker run --rm` para capturar stdout.

---

### Error 1: DATABASE_URL y REDIS_URL con `localhost`
El worker corre en el host Windows. Pasaba `process.env.DATABASE_URL` (que usa `localhost`) al contenedor Docker. Desde dentro del contenedor, `localhost` apunta al propio contenedor, no al host.

**Solución:** Variables nuevas en `.env`:
```
CONTAINER_DATABASE_URL=postgresql://e2e_user:e2e_pass@e2e_postgres:5432/e2e_platform
CONTAINER_REDIS_URL=redis://e2e_redis:6379
```
El processor usa estas variables al construir los `envVars` del contenedor.

---

### Error 2: nombres de columnas SQL en snake_case
Prisma genera columnas en camelCase (`testId`, `executionId`, `isDisabled`, `durationMs`, etc.) a menos que se use `@map`. El executor usaba snake_case en todas las queries.

**Solución:** Corrección de todas las queries SQL en `executor.js`:

| Incorrecto | Correcto |
|---|---|
| `er.test_id` | `er."testId"` |
| `er.execution_id` | `er."executionId"` |
| `ts.is_disabled` | `ts."isDisabled"` |
| `er.created_at` | `er."createdAt"` |
| `execution_result_id` | `"executionResultId"` |
| `duration_ms` | `"durationMs"` |
| `error_details` | `"errorDetails"` |
| `error_message` | `"errorMessage"` |

---

### Error 3: ExecutionResults no existían antes de lanzar el contenedor
El executor lee `execution_results` para saber qué tests ejecutar, pero el processor no los creaba antes de lanzar el contenedor.

**Solución:** El processor crea un `ExecutionResult` por cada test antes de hacer `docker run`.

```ts
for (const test of tests) {
  await this.prisma.executionResult.create({
    data: { executionId, testId: test.id, status: ExecutionStatus.RUNNING },
  });
}
```

---

## 6. Botón "Ejecutar" en la UI

### Problema: el botón no tenía `onClick`
El botón Ejecutar en `TestDetailPage` era decorativo — sin handler.

**Solución:**
- Handler `handleRun` que obtiene `projectId` desde `test.suite.projectId`
- Si el test está en `DRAFT`, lo activa automáticamente antes de ejecutar
- Llama a `executionsApi.trigger(...)` y navega a `/executions/:id`
- Selector `DRAFT / ACTIVE` agregado para cambio manual de estado

---

### Problema: "Ejecución no encontrada" al navegar al detalle
`ExecutionDetailPage` usaba `Promise.all([getOne, getResults])`. El endpoint `GET /executions/:id/results` no existía → el Promise.all rechazaba → `execution` quedaba `null`.

**Solución:** Agregar el endpoint faltante:
- `GET /executions/:id/results` en controller y service
- Incluye `test: { id, name }` en cada resultado

---

## 7. Endpoint GET /suites/:suiteId

Agregado para que el frontend pueda resolver el `projectId` de un test a partir de su `suiteId`, necesario cuando `test.suite` no está disponible en el estado local.

---

## Resumen de archivos modificados

| Área | Archivos clave |
|---|---|
| Recorder container | `recorder/src/recorder.js` |
| Executor container | `executor/src/executor.js` |
| Backend — Prisma | `Backend/prisma/schema.prisma` (modelo Recording) |
| Backend — Recorder | `recorder.service.ts`, `recorder.controller.ts`, `recorder.gateway.ts`, `recorder-session.ts`, `convert-recording.dto.ts` |
| Backend — Tests | `tests.service.ts`, `tests.controller.ts` |
| Backend — Executions | `executions.service.ts`, `executions.controller.ts` |
| Backend — Worker | `execution.processor.ts`, `docker.service.ts` |
| Backend — Config | `.env` (CONTAINER_DATABASE_URL, CONTAINER_REDIS_URL) |
| Frontend — Recorder | `RecorderPage.tsx`, `RemoteBrowserFrame.tsx`, `useRecorderSocket.ts`, `useRecordings.ts`, `RecordingsPage.tsx` |
| Frontend — Tests | `TestDetailPage.tsx` |
| Frontend — Proyectos | `ProjectDetailPage.tsx` |
| Frontend — Router | `index.tsx`, `routes.ts` |
| Frontend — Layout | `Sidebar.tsx` |
| Instalador | `install-easytest.exe` (PowerShell → PS2EXE) |
