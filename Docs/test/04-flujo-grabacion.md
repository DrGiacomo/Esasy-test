# 04 — Flujo de GRABACIÓN (en vivo)

- **Tipo:** integración en vivo con Docker (contenedor recorder real)
- **Script:** `node Docs/test/_run-recorder.mjs`
- **Fecha:** 2026-06-27
- **Alcance:** valida cableado infra + persistencia + conversión a test. **No** simula interacción real del usuario (eventos CDP del browser), así que la grabación sale con 0 pasos — esperado.

## Cómo debería ser el flujo
1. `POST /recorder/sessions {projectId, targetUrl}` → arranca un contenedor recorder que abre el target y captura acciones por CDP, devolviendo `sessionId`.
2. El frontend se une al room WS con ese `sessionId` y recibe frames + pasos capturados.
3. `DELETE /recorder/sessions/:id` → detiene el contenedor y **persiste** la grabación.
4. `POST /recorder/recordings/:id/convert {suiteId, testName}` → mapea los pasos capturados a un test ejecutable.

## Resultado: ⚠️ bug encontrado → 🛠️ arreglado → ✅ funciona

### Bug encontrado (primer intento)
`POST /recorder/sessions` devolvía **HTTP 500**:
```
Converting circular structure to JSON
  --> starting at object with constructor 'Timeout'
```
- **Causa raíz:** el controller devolvía el objeto `RecorderSession` **crudo**, que incluye `expireTimer` (un `NodeJS.Timeout` del auto-expire de 30 min). NestJS hace `JSON.stringify` de la respuesta → revienta con estructura circular.
- **Impacto:** el endpoint **siempre** fallaba tras arrancar el contenedor → la UI nunca recibía el `sessionId`, **imposible iniciar una grabación**. Además dejaba el contenedor recorder huérfano.
- **Origen probable:** regresión del cambio "expire timer cancelable" del audit 2026-06-15 (se empezó a guardar el timer en el objeto sesión que se retorna).

### Fix aplicado
`recorder.controller.ts` → `start()` ahora proyecta solo campos serializables y seguros:
`{ sessionId, projectId, targetUrl, status, startedAt }` (coincide con el tipo `RecorderSession` del frontend; ya no expone `containerId`/`orgId`/`expireTimer`).

### Segundo intento: ✅
```
start recorder session...
   sessionId: 7748f6c0-4ea8-4bbe-b829-a2f1be0d5009
stop recorder session (persist)...
   recordings: 1   steps capturados: 0
convert recording -> test...
   testId: 8eca623d-...   name: From Recording
RECORDER OK
```
- Contenedor recorder provisiona ✅
- Sesión se detiene y persiste la grabación ✅
- Conversión grabación → test ✅
- Sin contenedores recorder huérfanos tras la prueba ✅

## Pendiente de probar (no cubierto aquí)
- Captura real de pasos vía CDP (requiere conducir el browser con interacciones reales) — la grabación salió con 0 pasos.
- El handshake WS del contenedor recorder contra el gateway (auth con `RECORDER_TOKEN`).
