# PENDIENTES / ROADMAP — Easy-test

> **Documento vivo** — consolida todo lo que falta por hacer en la plataforma.
> **Creado:** 2026-06-26
> **Fuentes:** `audit-2026-06-15.md` (bugs), `perfeccionar-2026-06-15.md` (mejoras) y notas de proyecto.
> **Estado del producto:** flujo core (grabar → convertir → ejecutar → ver con video) **funcional**. Lo de abajo es robustez, infra y features incompletas.
>
> **Avance estimado:** MVP funcional ~90% · Producto grado producción ~85% (2026-06-28: cerrados TODOS los pendientes de prioridad alta 🟠 — self-healing automático, Gemini multimodal, calidad de selectores, retención de artefactos, git sync real y cobertura de tests worker/recorder/frontend).

---

## Leyenda
- 🔴 **Crítico para producción** — bloquea uso real con clientes.
- 🟠 **Alto** — impacto fuerte en robustez/calidad.
- 🟡 **Medio** — mejora notable, no bloqueante.
- 🟢 **Bajo** — nice-to-have.
- Estado: `ABIERTO` · `EN CURSO` · `HECHO`.

---

## 1. Infraestructura y proceso de desarrollo

| # | Pendiente | Prioridad | Estado | Notas |
|---|---|---|---|---|
| 1.1 | **CI/CD** — `.github/workflows/ci.yml` con build + typecheck + test (backend y frontend) en cada push/PR a master | 🔴 | **HECHO (2026-06-26)** | Gates: backend `prisma generate`+`build`+`test`; frontend `build` (tsc+vite). Lint queda fuera por ahora (el script backend usa `--fix`). |
| 1.2 | **Cobertura de tests del worker** (`execution.processor`) | 🟠 | **HECHO (2026-06-28)** | `execution.processor.spec.ts`: secretos + ciclo de vida/cancelación/timeout (`waitForContainerOrAbort`). Tests de `auto-healing` y `artifact-cleanup`. |
| 1.3 | **Tests del recorder** | 🟠 | **HECHO (2026-06-28)** | `recorder.service.spec.ts`: guards multi-tenant, collapse/dedupe de steps, passthrough de `selectorType`. |
| 1.4 | **Tests del frontend** | 🟠 | **HECHO (2026-06-28)** | Vitest + Testing Library cableados (`vitest.config.ts`, setup, scripts). Test de `StatusBadge`. CI corre `npm test`. |
| 1.5 | **Retención/limpieza de artefactos** — job/TTL para `/artifacts/{executionId}/` | 🟠 | **HECHO (2026-06-28)** | `ArtifactCleanupService`: cron diario (3 AM) borra dirs > `ARTIFACTS_RETENTION_DAYS` (def 14). Corre en el worker (tiene el volumen). |

## 2. Ejecución y motor

| # | Pendiente | Prioridad | Estado | Notas |
|---|---|---|---|---|
| 2.1 | **Recogida de artefactos coherente** — `artifact-collector.service.ts:19` busca `${testId}_final.png` que solo existe con `RECORD_VIDEO=false` → con video, `screenshotUrl` siempre null | 🟡 | ABIERTO | Unificar screenshot + video. |
| 2.2 | **`MAX_PARALLEL` / `RECORD_VIDEO` por proyecto** — `execution.processor.ts:48-54` no propaga estas vars; el executor usa defaults fijos | 🟡 | ABIERTO | Control de coste/paralelismo por proyecto. |

## 3. Grabación y conversión

| # | Pendiente | Prioridad | Estado | Notas |
|---|---|---|---|---|
| 3.1 | **Mejor calidad de selectores** — priorizar `data-testid`/aria/texto | 🟠 | **HECHO (2026-06-28)** | `recorder.js`: `buildSelectorInPage` computa selectores robustos (data-testid > id estable > aria-label > [name] > texto > css acotado) en clicks por coordenadas y refina los CSS crudos. `selectorType` fluye hasta el `TestStep`. |
| 3.2 | **Persistir grabación incrementalmente** — `recorder.service.ts:87-92` acumula en memoria; si el backend cae antes de `stop()` se pierde todo | 🟡 | ABIERTO | Flush periódico a BD. |

## 4. IA y self-healing

| # | Pendiente | Prioridad | Estado | Notas |
|---|---|---|---|---|
| 4.1 | **Self-healing automático** — capturar contexto del fallo y disparar healing | 🟠 | **HECHO (2026-06-28)** | El executor guarda `${stepId}_failure.{html,png}` al fallar; el worker (`AutoHealingService`) los lee tras la ejecución y crea propuestas `PENDING_APPROVAL` vía `SelfHealingService.proposeAutomatic` (gateado por `AUTO_HEALING_ENABLED`). Humano sigue en el bucle. ⚠️ Reconstruir imagen del executor. |
| 4.2 | **Reintentos/backoff en el provider** — `deepseek.provider.ts` hace un POST único; un 429/5xx tumba la operación | 🟡 | ABIERTO | Backoff exponencial (axios ya está). |
| 4.3 | **Umbral de confianza en self-healing** | 🟡 | **PARCIAL (2026-06-28)** | El path automático descarta propuestas por debajo de `SELF_HEALING_MIN_CONFIDENCE` (def 0.5) y deduplica. El path manual sigue creando sin filtrar. |
| 4.4 | **Proveedor Gemini multimodal** — imágenes para diagnóstico + potenciar self-healing. Convive con DeepSeek (texto) | 🟠 | **HECHO (2026-06-28)** | `GeminiProvider` (multimodal) cableado bajo `VISION_PROVIDER` (recae en DeepSeek si no hay `GEMINI_API_KEY`). `AiMessage.images` + `self-healing` adjunta el screenshot del fallo. Video: fase 2. |

## 5. Features de producto a medio cablear

| # | Pendiente | Prioridad | Estado | Notas |
|---|---|---|---|---|
| 5.1 | **Secretos al executor** — el executor ahora recibe los secretos `ENV_VAR` de la org descifrados; los pasos los referencian como `{{NOMBRE}}` | 🔴 | **HECHO (2026-06-26)** | Diseño: el worker (`execution.processor`) descifra vía Vault e inyecta `NAME=value` (omite nombres reservados); el executor resuelve `{{NOMBRE}}` en `selector`/`value`. Eliminado el código muerto `getDecryptedValue()`. ⚠️ Reconstruir imagen del executor. |
| 5.2 | **Git sync real** — push al repo | 🟠 | **HECHO (2026-06-28)** | `GithubProvider`/`GitlabProvider` hacen push real vía API REST (Contents/Repository Files), crean o actualizan el archivo. `git.service.sync` descifra el token, sanea la ruta (`syncPath/<slug>.spec.ts`) y commitea. Soporta Enterprise/self-hosted (`GITHUB_API_URL`/`GITLAB_API_URL`). |

## 6. Deuda técnica menor

| # | Pendiente | Prioridad | Estado | Notas |
|---|---|---|---|---|
| 6.1 | **Renombrar `semanticModel`** | 🟢 | ABIERTO | Requiere migración Prisma, bajo valor. |

---

## Orden recomendado de ataque

> **2026-06-28:** cerrados los 2 críticos 🔴 (5.1, 1.1) y TODOS los altos 🟠 (1.2–1.5, 3.1, 4.1, 4.4, 5.2).
> Lo que queda es 🟡 medio / 🟢 bajo:

1. **Recogida de artefactos coherente (2.1)** — `screenshotUrl` null cuando hay video.
2. **`MAX_PARALLEL`/`RECORD_VIDEO` por proyecto (2.2)** — control de coste/paralelismo.
3. **Reintentos/backoff en el provider IA (4.2)** y **umbral de confianza en path manual (4.3)**.
4. **Persistir grabación incrementalmente (3.2)** — no perder todo si el backend cae.
5. **Renombrar `semanticModel` (6.1)** — cosmético, requiere migración.

> ⚠️ **Acción de despliegue pendiente:** reconstruir las imágenes del **executor** y **recorder**
> (`docker compose --profile build-images build`) para que tomen la captura de fallos y los
> selectores robustos nuevos.
