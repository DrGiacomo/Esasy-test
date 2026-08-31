# 03 — Flujo de EJECUCIÓN E2E (en vivo)

- **Tipo:** integración en vivo con Docker (postgres, redis, contenedor executor real)
- **Script:** `node Docs/test/_run-flow.mjs`
- **Fecha:** 2026-06-27
- **Objetivo principal:** validar que el flujo ejecutar→resultados funciona **y** que la nueva inyección de secretos resuelve `{{NOMBRE}}` end-to-end.

## Cómo debería ser el flujo
1. Usuario se registra → org + JWT.
2. Crea proyecto → suite → test → pasos.
3. (Opcional) Crea secretos `ENV_VAR`.
4. Activa el test y dispara una ejecución.
5. Backend encola en BullMQ → worker provisiona un contenedor Docker (executor) → Playwright corre los pasos → publica estado por Redis/WS → guarda resultados (+ video).
6. Usuario ve estado en vivo y artefactos.

## Qué se probó
- Registro → proyecto (`baseUrl=https://example.com`) → suite → test.
- Pasos: `navigate` con `value = "{{TARGET_URL}}"` + `wait 500`.
- Secreto `TARGET_URL = https://example.com` (tipo `ENV_VAR`).
- Activar test → disparar ejecución → polling hasta estado terminal.

## Resultado: ✅ COMPLETED

```
[10] status=COMPLETED
executionId: 58a8a229-20a2-464a-8fa8-0f1ba6525148
dockerContainerId: 66a667b6c5fb...
videoUrl: /artifacts/58a8a229-.../ec066624-....webm
```

### Evidencia dura de que el secreto se resolvió
1. **Log del worker:** `[ExecutionProcessor] Inyectando 1 secreto(s) en la ejecución 58a8a229-...`
2. **step_results en BD:**

   | acción | status | durationMs |
   |---|---|---|
   | navigate | PASSED | 294 |
   | wait | PASSED | 501 |

   El paso `navigate {{TARGET_URL}}` pasó: si el placeholder **no** se hubiera resuelto, `page.goto("{{TARGET_URL}}")` habría fallado con URL inválida. Que cargara `https://example.com` demuestra la sustitución.
3. El log imprime el paso con el placeholder **crudo** (`{{TARGET_URL}}`), no el valor → no se filtran secretos en logs. ✅

## Notas / hallazgos detectados aquí
- **`.env` no define `CONTAINER_DATABASE_URL` / `CONTAINER_REDIS_URL`.** Sin ellas, el contenedor executor recibe `localhost` y no alcanza la BD/Redis (que viven en otros contenedores). Hubo que aportarlas por entorno al worker. → Documentar en `.env.example`. Ver [05-hallazgos](05-hallazgos.md).
- **`screenshotUrl` quedó `null`** con video activo: el `artifact-collector` busca `${testId}_final.png` que el executor solo genera con `RECORD_VIDEO=false`. Ya estaba en el roadmap (perfeccionar 2.1).
