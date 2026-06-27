# PENDIENTES / ROADMAP — Easy-test

> **Documento vivo** — consolida todo lo que falta por hacer en la plataforma.
> **Creado:** 2026-06-26
> **Fuentes:** `audit-2026-06-15.md` (bugs), `perfeccionar-2026-06-15.md` (mejoras) y notas de proyecto.
> **Estado del producto:** flujo core (grabar → convertir → ejecutar → ver con video) **funcional**. Lo de abajo es robustez, infra y features incompletas.
>
> **Avance estimado:** MVP funcional ~90% · Producto grado producción ~75% (2026-06-26: cerrados los 2 críticos — secretos al executor y CI/CD; de paso se arregló un error de tipos que rompía el build del frontend).

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
| 1.2 | **Cobertura de tests del worker** (`execution.processor`) | 🟠 | EN CURSO | Añadido `execution.processor.spec.ts` (inyección de secretos). Falta el ciclo de vida del contenedor/cancelación. |
| 1.3 | **Tests del recorder** | 🟠 | ABIERTO | Sin cobertura. |
| 1.4 | **Tests del frontend** | 🟠 | ABIERTO | Cero tests de UI. |
| 1.5 | **Retención/limpieza de artefactos** — job/TTL para `/artifacts/{executionId}/` | 🟠 | ABIERTO | Hoy el disco crece sin límite. |

## 2. Ejecución y motor

| # | Pendiente | Prioridad | Estado | Notas |
|---|---|---|---|---|
| 2.1 | **Recogida de artefactos coherente** — `artifact-collector.service.ts:19` busca `${testId}_final.png` que solo existe con `RECORD_VIDEO=false` → con video, `screenshotUrl` siempre null | 🟡 | ABIERTO | Unificar screenshot + video. |
| 2.2 | **`MAX_PARALLEL` / `RECORD_VIDEO` por proyecto** — `execution.processor.ts:48-54` no propaga estas vars; el executor usa defaults fijos | 🟡 | ABIERTO | Control de coste/paralelismo por proyecto. |

## 3. Grabación y conversión

| # | Pendiente | Prioridad | Estado | Notas |
|---|---|---|---|---|
| 3.1 | **Mejor calidad de selectores** — `recorder.service.ts:152-154` usa CSS crudo; priorizar `data-testid`/rol/texto | 🟠 | ABIERTO | Reduce tests frágiles y dependencia del self-healing. |
| 3.2 | **Persistir grabación incrementalmente** — `recorder.service.ts:87-92` acumula en memoria; si el backend cae antes de `stop()` se pierde todo | 🟡 | ABIERTO | Flush periódico a BD. |

## 4. IA y self-healing

| # | Pendiente | Prioridad | Estado | Notas |
|---|---|---|---|---|
| 4.1 | **Self-healing automático** — el executor NO captura HTML/screenshot al fallar ni dispara `/ai/heal`; hoy es 100% manual | 🟠 | ABIERTO | Capturar contexto del fallo y disparar healing. |
| 4.2 | **Reintentos/backoff en el provider** — `deepseek.provider.ts:20` hace un POST único; un 429/5xx tumba la operación | 🟡 | ABIERTO | Backoff exponencial (axios ya está). |
| 4.3 | **Umbral de confianza en self-healing** — `self-healing.service.ts:47-58` crea propuesta sin importar `confidence` | 🟡 | ABIERTO | Filtrar/ordenar por `confidenceAfter`. |
| 4.4 | **Proveedor Gemini multimodal** — imágenes/video; diagnóstico de fallos legible + potenciar self-healing. Convive con DeepSeek (texto) | 🟠 | ABIERTO | Empezar por imágenes gateadas a fallos; video fase 2. Extender `AiProvider` o crear `VisionProvider`. |

## 5. Features de producto a medio cablear

| # | Pendiente | Prioridad | Estado | Notas |
|---|---|---|---|---|
| 5.1 | **Secretos al executor** — el executor ahora recibe los secretos `ENV_VAR` de la org descifrados; los pasos los referencian como `{{NOMBRE}}` | 🔴 | **HECHO (2026-06-26)** | Diseño: el worker (`execution.processor`) descifra vía Vault e inyecta `NAME=value` (omite nombres reservados); el executor resuelve `{{NOMBRE}}` en `selector`/`value`. Eliminado el código muerto `getDecryptedValue()`. ⚠️ Reconstruir imagen del executor. |
| 5.2 | **Git sync real** — `git.service.ts:56` tiene `TODO`; el endpoint devuelve "Sync queued" y solo actualiza `lastSyncedAt`, no hace push real | 🟠 | ABIERTO | Implementar push al repo. |

## 6. Deuda técnica menor

| # | Pendiente | Prioridad | Estado | Notas |
|---|---|---|---|---|
| 6.1 | **Renombrar `semanticModel`** | 🟢 | ABIERTO | Requiere migración Prisma, bajo valor. |

---

## Orden recomendado de ataque
1. **Secretos al executor (5.1)** — desbloquea correr tests reales con credenciales.
2. **CI/CD (1.1)** — red de seguridad para todo lo demás.
3. **Self-healing automático (4.1) + Gemini imágenes (4.4)** — diferenciador del producto.
4. **Calidad de selectores (3.1)** — menos fragilidad de raíz.
5. **Retención de artefactos (1.5)** — antes de que el disco sea un problema.
6. Resto de robustez (reintentos IA, recogida de artefactos, persistencia incremental) y cobertura de tests.
