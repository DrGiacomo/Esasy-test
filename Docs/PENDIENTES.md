# PENDIENTES / ROADMAP — Easy-test

> 📖 **Manda sobre este documento: [`BIBLIA_PROYECTO.md`](BIBLIA_PROYECTO.md).** Si algo de
> aquí la contradice, o se actualiza la biblia, o se descarta lo de aquí.

> **Documento vivo** — consolida todo lo que falta por hacer en la plataforma.
> **Creado:** 2026-06-26
> **Fuentes:** `audit-2026-06-15.md` (bugs), `perfeccionar-2026-06-15.md` (mejoras) y notas de proyecto.
> **Estado del producto:** flujo core (grabar → convertir → ejecutar → ver con video) **funcional**. Lo de abajo es robustez, infra y features incompletas.
>
> **Avance estimado:** MVP funcional ~95% · Producto grado producción ~90% (2026-06-28: cerrados TODOS los pendientes 🔴🟠🟡🟢 del roadmap. Solo queda deuda operativa: el lint no es gate de CI por un desajuste pre-existente CRLF/prettier en todo el repo — requeriría un reformat global).

---

## ✅ Datos de demostración (`seed`) — añadido el `2026-08-13`, **HECHO el `2026-09-04`**

> `Backend/prisma/seed.ts` + `npm run db:seed`. Verificado en vivo: siembra, es idempotente
> (dos pasadas dejan 1 organización, 2 usuarios, 3 pruebas, 10 pasos) y `--borrar` retira lo
> suyo dejando intactas las 11 organizaciones que ya había. Entregable `4.4` de la Fase 4.

Cruce #5 de `C:\Proyectos\Docs\TRASPLANTES_CRUZADOS.md`: **S.A.A.I → todos**. Con el flujo core
funcionando al 95 %, lo que falta para enseñarlo no es producto: es que arranque con una
organización, un proyecto y un test dentro, en vez de una pantalla vacía.

**Patrón a copiar** de `Induccion S.A.A.I\Backend\usuarios\management\commands\datos_demo.py` (ya
trasplantado a RUKIA el mismo día, con su salvaguarda): idempotente · marca `[demo]` y borra solo
lo suyo · `--borrar` · **los datos cuentan una historia** (aquí: un test que pasa, uno que falla por
selector roto y su propuesta de self-healing en `PENDING_APPROVAL`) · imprime un guion de qué mirar
al terminar · se niega si la base ya tiene datos reales.

> Multi-tenant obliga a una decisión extra que los otros proyectos no tienen: **el seed crea su
> propia organización de demostración**, nunca siembra dentro de una existente.

**Estimado: 30-45 min** (Prisma + el árbol org → proyecto → test → flujo → ejecución).

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
| 2.1 | **Recogida de artefactos coherente** — `screenshotUrl` null con video | 🟡 | **HECHO (2026-06-28)** | El executor escribe SIEMPRE `${testId}_final.png` (en el `finally`, con y sin video); el `artifact-collector` ya lo encuentra. |
| 2.2 | **`MAX_PARALLEL` / `RECORD_VIDEO` por proyecto** | 🟡 | **HECHO (2026-06-28)** | Columnas `Project.maxParallel`/`recordVideo` (+ migración + DTOs); el worker las propaga al contenedor como env. Control de coste/paralelismo por proyecto. |

## 3. Grabación y conversión

| # | Pendiente | Prioridad | Estado | Notas |
|---|---|---|---|---|
| 3.1 | **Mejor calidad de selectores** — priorizar `data-testid`/aria/texto | 🟠 | **HECHO (2026-06-28)** | `recorder.js`: `buildSelectorInPage` computa selectores robustos (data-testid > id estable > aria-label > [name] > texto > css acotado) en clicks por coordenadas y refina los CSS crudos. `selectorType` fluye hasta el `TestStep`. |
| 3.2 | **Persistir grabación incrementalmente** | 🟡 | **HECHO (2026-06-28)** | `recorder.service` hace flush cada 10s vía `upsert` por `sessionId`; el guardado final fija `stoppedAt`. Si el backend cae antes de `stop()`, se recupera lo último persistido. |

## 4. IA y self-healing

| # | Pendiente | Prioridad | Estado | Notas |
|---|---|---|---|---|
| 4.1 | **Self-healing automático** — capturar contexto del fallo y disparar healing | 🟠 | **HECHO (2026-06-28)** | El executor guarda `${stepId}_failure.{html,png}` al fallar; el worker (`AutoHealingService`) los lee tras la ejecución y crea propuestas `PENDING_APPROVAL` vía `SelfHealingService.proposeAutomatic` (gateado por `AUTO_HEALING_ENABLED`). Humano sigue en el bucle. ⚠️ Reconstruir imagen del executor. |
| 4.2 | **Reintentos/backoff en el provider** | 🟡 | **HECHO (2026-06-28)** | `util/retry.ts` (`withRetry` + `isRetryableHttpError`): backoff exponencial con jitter ante 429/5xx/timeout, aplicado en DeepSeek y Gemini. |
| 4.3 | **Umbral de confianza en self-healing** | 🟡 | **HECHO (2026-06-28)** | El path automático descarta propuestas por debajo de `SELF_HEALING_MIN_CONFIDENCE` (def 0.5) y deduplica. El manual es a petición del usuario y la UI muestra `confidenceAfter` (`HealingProposalCard`). |
| 4.4 | **Proveedor Gemini multimodal** — imágenes para diagnóstico + potenciar self-healing. Convive con DeepSeek (texto) | 🟠 | **HECHO (2026-06-28)** | `GeminiProvider` (multimodal) cableado bajo `VISION_PROVIDER` (recae en DeepSeek si no hay `GEMINI_API_KEY`). `AiMessage.images` + `self-healing` adjunta el screenshot del fallo. Video: fase 2. |

## 5. Features de producto a medio cablear

| # | Pendiente | Prioridad | Estado | Notas |
|---|---|---|---|---|
| 5.1 | **Secretos al executor** — el executor ahora recibe los secretos `ENV_VAR` de la org descifrados; los pasos los referencian como `{{NOMBRE}}` | 🔴 | **HECHO (2026-06-26)** | Diseño: el worker (`execution.processor`) descifra vía Vault e inyecta `NAME=value` (omite nombres reservados); el executor resuelve `{{NOMBRE}}` en `selector`/`value`. Eliminado el código muerto `getDecryptedValue()`. ⚠️ Reconstruir imagen del executor. |
| 5.2 | **Git sync real** — push al repo | 🟠 | **HECHO (2026-06-28)** | `GithubProvider`/`GitlabProvider` hacen push real vía API REST (Contents/Repository Files), crean o actualizan el archivo. `git.service.sync` descifra el token, sanea la ruta (`syncPath/<slug>.spec.ts`) y commitea. Soporta Enterprise/self-hosted (`GITHUB_API_URL`/`GITLAB_API_URL`). |

## Especial — Features avanzadas (visión, no en el roadmap original)

> Features de mayor alcance que requieren infra/diseño nuevo. No bloquean el MVP.

| # | Feature | Prioridad | Estado | Notas |
|---|---|---|---|---|
| E.1 | **RAG sobre los datos del tenant** — grounding de la IA en los tests/grabaciones/ejecuciones de la propia org. Mejora el chat ("¿qué tests cubren el login?"), el `nl-to-flow` y el self-healing (recuperar selectores/pasos de tests similares antes de generar) → menos alucinación, más consistencia. | ⭐ Especial | ABIERTO | **Diseño:** vector store en **pgvector** sobre el Postgres existente (el filtro `organizationId` va en el mismo `WHERE` que la búsqueda vectorial → aislamiento multi-tenant con el patrón actual). Nuevo `EmbeddingProvider` (Gemini `text-embedding-004`; DeepSeek no expone embeddings) inyectado como `EMBEDDING_PROVIDER` igual que `VISION_PROVIDER`. Modelo `KnowledgeChunk {orgId, sourceType, sourceId, content, embedding vector(768)}` + índice HNSW (migración SQL a mano, Prisma usa `Unsupported`+`$queryRaw`). Ingesta vía job BullMQ ante cambios de dominio; recuperación `ORDER BY embedding <=> $query LIMIT k` con `orgId` filtrado PRIMERO; contexto inyectado en el system prompt de `ChatService`/`SelfHealingService`. **Orden:** (1) pgvector+modelo+migración, (2) EmbeddingProvider, (3) ingesta de tests, (4) RetrievalService+chat, (5) ampliar a grabaciones/ejecuciones+self-healing. **Riesgos:** fuga cross-tenant (test dedicado desde el día 1), coste/latencia de embeddings (re-embeber solo al cambiar `flowModel`), **nunca indexar secretos ni `{{NOMBRE}}` resueltos**. |

## 6. Deuda técnica menor

| # | Pendiente | Prioridad | Estado | Notas |
|---|---|---|---|---|
| 6.1 | **Renombrar `semanticModel` → `flowModel`** | 🟢 | **HECHO (2026-06-28)** | Migración `RENAME COLUMN` (preserva datos) + refs en backend y frontend. Alinea con el dominio "flow" del editor. |

---

## Estado

> **2026-06-28:** roadmap completo — cerrados 🔴 (5.1, 1.1), 🟠 (1.2–1.5, 3.1, 4.1, 4.4, 5.2) y 🟡/🟢 (2.1, 2.2, 3.2, 4.2, 4.3, 6.1).
>
> **2026-07-12:** segunda auditoría (`audit-2026-07-12.md`): 24 hallazgos nuevos (5🔴 5🟠 7🟡 7🟢).
> **5 críticos + 5 altos + 7 medios resueltos el mismo día** (3 commits en master). Solo quedan
> los 7 🟢 BAJOS abiertos.
> - 🔴 artefactos autenticados, DTOs estrictos en updateTest/updateStep, reorder con ownership, versiones con filtro de org.
> - 🟠 refresh con `isActive` + org preservada, vocabulario `assert` alineado API↔executor, executionResults no colgados, recorder valida projectId.
> - 🟡 transiciones de estado atómicas (worker + cancel), reject valida status, chat valida `relatedTestId`, versionNumber con advisory lock, recorder sin huérfanos/zombies + barrido al arrancar.
>
> ⚠️ **Nueva deuda operativa:** aplicar migración `20260712170000_refresh_token_org`
> (`npx prisma migrate deploy`) y reconstruir la imagen del **executor** (nuevo manejo de `assert`).

### Deuda operativa / despliegue
1. ✅ **Reconstruir imágenes** del executor y recorder — **HECHO el `2026-09-05`**. Verificado con
   una ejecución real: traza de `41,7 KB` en disco y `traceUrl` ya no es `null`.
2. ✅ **Migraciones aplicadas** — **HECHO el `2026-09-04`** (`npx prisma migrate deploy`); las dos
   que llevaban sin aplicar desde julio.
3. ✅ **El lint es gate de CI** — **HECHO el `2026-09-05`**. Eran **530** problemas, no ~444, y **80
   no eran de formato**: la causa se cerró declarando el fin de línea del proyecto
   (`.gitattributes`), no reformateando. `npm run lint:ci` sale con código 0 en los dos lados.

## 7. La interfaz de IA está construida y sin montar — hallazgo del `2026-09-05`

| # | Pendiente | Prioridad | Estado | Notas |
|---|---|---|---|---|
| 7.1 | **Montar `features/ai-assistant/` en la aplicación** — 4 componentes escritos que ninguna ruta importa | 🟠 | ABIERTO | `AiChatPanel`, `NlToFlowInput`, `AiChatMessage`, `HealingProposalCard` |
| 7.2 | **Consumir `GET /ai/estado`** para no ofrecer botones de IA cuando no hay clave | 🟡 | ABIERTO | El endpoint existe y funciona desde el `2026-09-05` (entregable 5.3). Depende de 7.1: hoy no hay botón que ocultar |

**Cómo se encontró, y por qué nadie lo había visto:** al escribir el aviso de IA del entregable
5.3 se dio por hecho que el frontend ofrecía funciones de IA. Se comprobó:

```
grep -rn "ai-assistant" Frontend/src   →  0 usos fuera de la propia carpeta
grep -rn "api.post.*ai/" Frontend/src  →  4 llamadas, todas DENTRO de esa carpeta
```

**El denominador, que es lo que duele:** de las **5 operaciones de IA** que expone el backend
—`chat`, `codegen`, `documentation`, `nl-to-flow`, `heal`—, las que se pueden usar desde la
pantalla son **0**. Lo único que la aplicación enseña de IA es el texto de `test.documentation`
**si el backend ya lo generó** por su cuenta (`TestDetailPage.tsx:116`).

**Por qué es 🟠 y no 🔴:** no rompe nada de lo que hoy funciona —el flujo core no pasa por
aquí—, pero **el §3 de `PROJECT_CONTEXT.md` promete «IA Contextual» como capacidad del
sistema**, y el perfil No-Code del §2.1 se apoya en ella. Es capacidad declarada sin puerta
de entrada.

---

## 8. La URL del proyecto no llega a ningún sitio — hallazgo del `2026-09-05`

**De dónde sale:** al usar la plataforma se preguntó por qué la URL se pide **dos veces**, al
crear el proyecto y otra vez al grabar. Al mirarlo, la razón es peor que la duplicación.

| Qué se pide | Para qué sirve HOY |
|---|---|
| `Project.baseUrl` — al crear el proyecto | **Solo la lee la IA**, para documentar y para generar flujos en lenguaje natural |
| URL de la grabación — al empezar a grabar | La que abre el navegador. Se guarda como primer paso (`Ir a …`) y es la que reproduce el ejecutor |

**El ejecutor no usa `baseUrl` en ningún sitio.** Cada paso lleva la dirección entera escrita
dentro.

| # | Pendiente | Prioridad | Estado | Notas |
|---|---|---|---|---|
| 8.1 | **Que la URL del proyecto llegue al grabador** — al elegir proyecto, rellenar el campo con su `baseUrl`, editable | 🟡 | ABIERTO | Barato: `RecorderPage.tsx` **ya tiene el selector de proyecto** (línea 15) justo encima del campo, que arranca vacío (línea 14). Es unir dos cosas que ya están |
| 8.2 | **Guardar los pasos relativos a `baseUrl`**, no con la dirección completa | 🟠 | ABIERTO | Lo que de verdad resuelve el problema. Depende de decidir qué pasa con los tests que ya existen |

**La consecuencia medible de 8.2, que es la que duele:** si la aplicación cambia de dirección
—de `pruebas.empresa.com` a `nuevo.empresa.com`, o al pasar de un entorno a otro— hay que
**editar test por test**, aunque el proyecto tenga su URL bien puesta. Con los datos de hoy en
la base: **34 pruebas** que habría que tocar a mano.

**Por qué 8.1 no basta solo:** prellenar el campo ahorra un copiar-pegar, pero el paso que se
guarda sigue llevando la dirección entera dentro. Es la mitad cómoda; `8.2` es la mitad útil.
Se anotan las dos por separado para que no se dé por resuelto el problema al hacer la fácil.

---

## 9. La RLS: qué costaría de verdad — hallazgo del `2026-09-05`

**Estado.** El SQL de las políticas está escrito (`Backend/prisma/rls/001_rls_policies.sql`) y
**nunca se ha aplicado**: vive fuera de `prisma/migrations/`. El interceptor que fijaba el
contexto **se retiró el `2026-09-05`** porque no funcionaba en ninguno de sus tres pasos y
simulaba una defensa inexistente (`M12`). Lo que aísla hoy —y está auditado— es el filtro por
`organizationId` de la capa de aplicación.

| # | Pendiente | Prioridad | Estado |
|---|---|---|---|
| 9.1 | **Contexto de organización por petición**, para que la base pueda filtrar | 🟠 | ABIERTO |
| 9.2 | **Aplicar las políticas** como migración, después de 9.1 y nunca antes | 🟠 | ABIERTO |

### Por qué no es un parche, y esto es lo que hay que saber antes de decidir

Para que PostgreSQL pueda filtrar, **cada consulta tiene que correr en una transacción que
lleve el `organizationId` fijado en esa misma conexión**. Hoy hay **25 servicios** que hablan
con Prisma directamente. Las dos formas de conseguirlo:

| Vía | Qué implica | Riesgo |
|---|---|---|
| Transacción por petición + `AsyncLocalStorage`, con `PrismaService` devolviendo la transacción activa | No hay que tocar los 25 servicios: se resuelve con un proxy en `PrismaService` | **Alto.** Toda petición pasa a ser una transacción larga: más conexiones ocupadas, riesgo de bloqueos y de agotar el pool |
| `set_config` explícito en cada consulta | Sin transacciones largas | Hay que tocar los 25 servicios, y **el que se olvide de uno crea el agujero que esto venía a tapar** |

### ⚠️ El orden no es negociable

**Primero 9.1, después 9.2.** Con las políticas aplicadas y el contexto sin fijar, PostgreSQL
no devuelve **ni una fila**: la plataforma deja de funcionar entera, no «un poco».

Y ojo con el atajo: quitar el `LOCAL` para que el valor «se quede» convierte una defensa inerte
en una **fuga activa**, porque la conexión vuelve al pool con el `organizationId` del usuario
anterior y la hereda el siguiente.

### Qué se gana

**Defensa en profundidad**, no una corrección: si un día una consulta se olvida del filtro, la
base la para. Es valioso, y **no es urgente** mientras el filtro de aplicación esté auditado —
lo estuvo el `2026-09-05` y salió correcto, incluidos los endpoints que aceptan un id por la URL.

**Lo urgente ya está hecho:** los documentos ya no afirman que exista, y el interceptor que lo
fingía está fuera del código.

---

### Mejoras futuras (no bloqueantes, fuera del roadmap original)
- Self-healing con video (no solo screenshot) — fase 2 de la visión multimodal.
- Documentación automática de tests (`documentation.service`) y métricas de coste IA.
