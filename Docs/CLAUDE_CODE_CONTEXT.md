# CONTEXTO DE PROYECTO — Para Claude Code

## Rol esperado
Actúa como Arquitecto de Software Senior y Lead Engineer. Toda decisión técnica debe ser de grado producción. Evita scaffolding genérico, boilerplate innecesario y patrones de tutorial.

---

## Qué es este proyecto

Plataforma web fullstack de automatización de pruebas E2E inspirada en Playwright, Testim y Mabl.
Orientada a producción, modular, extensible. Combina grabación visual, generación de código, ejecución aislada y agentes IA bajo una sola interfaz.

**Filosofía:** Low-code visual como capa primaria. El código es capa secundaria opcional para power users.

---

## Stack tecnológico — NO negociable

| Capa | Tecnología |
|---|---|
| Frontend | React + Vite + TypeScript |
| Backend | NestJS + TypeScript |
| API | REST + WebSockets (socket.io o ws nativo) |
| Base de datos | PostgreSQL + Prisma ORM |
| Cola | BullMQ + Redis |
| Ejecución | Docker (contenedores efímeros) + Playwright Core |
| Grabación | Playwright CDP + WebSocket stream |
| IA | DeepSeek API + LangChain (semicustom prompt manager) |
| Secrets | Vault / Secrets Manager (wrapper propio) |
| Git | Módulo independiente (GitHub + GitLab) |

---

## Decisiones de arquitectura ya tomadas — NO reabrir

1. **Multi-tenancy:** Instancia privada. Aislamiento por `organization_id`. Sin billing ni planes.
2. **Auth:** JWT propio gestionado por NestJS. Refresh token rotation. Hash SHA-256 del token en DB, nunca el token en claro.
3. **Roles:** `ADMIN | EDITOR | VIEWER` por membresía (`Membership` table). El JWT lleva `userId + orgId`. El guard verifica el rol en cada request.
4. **Versiones de tests:** Snapshot `JSONB` en PostgreSQL. Sin filesystem externo. Inmutables — solo se crean, nunca se modifican.
5. **Self-Healing:** La IA **propone** el fix. Estado `PENDING_APPROVAL`. El usuario acepta o rechaza. **Nunca modifica un `TestStep` sin aprobación explícita.**
6. **Recorder Engine:** Contenedor Docker separado del Backend. Se comunica via WebSocket CDP.
7. **Concurrencia local:** 5–20 ejecuciones simultáneas. Diseñar BullMQ concurrency en consecuencia.
8. **AI Provider:** DeepSeek fijo. El wrapper debe ser provider-agnostic internamente para facilitar migración futura.
9. **Despliegue:** Docker Compose local durante desarrollo. Migración a servidor después.
10. **RLS:** ⚠️ **NO está en funcionamiento.** El interceptor lanza `SET LOCAL app.current_org_id` sin esperar la promesa y fuera de transacción —donde `SET LOCAL` no hace nada—, y las políticas SQL **nunca se han aplicado**. El aislamiento real es el filtro por `organizationId` de cada consulta. No confíes en que la base te proteja: hoy no lo hace.

---

## Schema de base de datos — YA DISEÑADO

> ⚠️ **Manda `Backend/prisma/schema.prisma` en disco, no la lista de abajo.** Hay 4
> migraciones aplicadas desde que se escribió este documento (la última,
> `20260712170000_refresh_token_org`). Las políticas RLS de `Backend/prisma/rls/` **NO se
> aplican**: nadie las ejecuta.
> La lista sirve para entender el dominio; para saber qué columnas hay, se abre el schema.

El archivo `prisma/schema.prisma` ya existe y está completo. **No regenerar ni modificar el schema a menos que se pida explícitamente.**

### Modelos existentes y su propósito

**Identidad / Auth**
- `Organization` — Unidad raíz de aislamiento. Todo recurso pertenece a una org.
- `User` — Usuario de la plataforma. Puede pertenecer a múltiples orgs.
- `Membership` — Tabla de unión `User ↔ Organization` con rol. Fuente de verdad de permisos.
- `RefreshToken` — Token de refresco. Guarda hash SHA-256, `revokedAt` para invalidación sin borrar.

**Proyectos / Tests**
- `Project` — Agrupa suites bajo una organización. Tiene `baseUrl` de la app bajo prueba.
- `TestSuite` — Agrupador lógico de tests. Equivalente a un `.spec.ts`.
- `Test` — Test individual. Tiene `semanticModel` (JSON) y `generatedCode` (TypeScript POM).
- `TestStep` — Paso atómico: `action | selector | selectorType | value | confidenceScore`.
- `TestVersion` — Snapshot inmutable JSONB. Se crea antes de cada modificación significativa.

**Ejecuciones**
- `Execution` — Ejecución de proyecto/suite. Ciclo: `QUEUED → PROVISIONING → RUNNING → COLLECTING → COMPLETED/FAILED/CANCELLED`.
- `ExecutionResult` — Resultado por test dentro de una ejecución. Tiene `screenshotUrl | videoUrl | traceUrl`.
- `StepResult` — Resultado por paso. Tiene `actualValue` para assertions.

**IA**
- `AiAuditLog` — Registro permanente de cada operación IA. Incluye `inputTokens | outputTokens | latencyMs`. NUNCA borrar.
- `SelectorHealingLog` — Propuesta de self-healing. Estados: `PENDING_APPROVAL | APPROVED | REJECTED | SUPERSEDED`.

**Soporte**
- `GitIntegration` — Config Git por organización. `encryptedToken` cifrado via Vault wrapper.
- `Secret` — Secretos por org. `encryptedValue` AES-256. Se inyectan como env vars en Docker, nunca al frontend.

### Enums existentes
```
MemberRole:       ADMIN | EDITOR | VIEWER
TestStatus:       DRAFT | ACTIVE | ARCHIVED
ExecutionStatus:  QUEUED | PROVISIONING | RUNNING | COLLECTING | COMPLETED | FAILED | CANCELLED
StepResultStatus: PASSED | FAILED | SKIPPED
HealingStatus:    PENDING_APPROVAL | APPROVED | REJECTED | SUPERSEDED
AiOperationType:  CODEGEN | SELF_HEALING | NL_TO_FLOW | DOCUMENTATION | CHAT
GitProvider:      GITHUB | GITLAB
SecretType:       ENV_VAR | GIT_TOKEN | WEBHOOK_SECRET
```

---

## Perfiles de usuario — afectan decisiones de UI/UX y API

### QA Manual / No-Code
- Sin conocimiento de programación.
- Nunca exponer: código, selectores CSS/XPath, clases, comandos de terminal.
- Interacción via flujos visuales, lenguaje natural e IA.

### QA Automation / Power User
- Acceso al TypeScript POM generado.
- Edición directa de scripts desde la plataforma.
- Sincronización con repositorios Git.

---

## Principios de diseño — aplicar en cada decisión

| Principio | Implicación práctica |
|---|---|
| Desacoplamiento | Módulos independientes por dominio. Comunicación via interfaces, no implementaciones. |
| Escalabilidad | Cada ejecución en su propio contenedor Docker efímero. |
| Seguridad | Aislamiento por organización en la aplicación (**la RLS está escrita y sin aplicar**). Vault para secretos. JWT con rotación. Nunca secretos en logs. |
| Extensibilidad | AI Engine con wrapper provider-agnostic. Git service intercambiable. |
| Mantenibilidad | TypeScript estricto en frontend y backend. Sin `any`. |
| Low-Code First | La UI visual es la capa primaria. El código es opt-in. |

---

## Fase actual

> **El estado de fases vive en `PROJECT_CONTEXT.md` §6 y solo ahí.** Este documento no lo
> declara: cuando lo declaraba, se quedó tres meses diciendo «Fase 1 — Solo diseño» y
> ordenando **«no escribir código de implementación»** mientras se construía la plataforma
> entera. Cualquiera que llegue aquí buscando dónde estamos, va a §6.

**Fases 1-3 cerradas. Fase 4 (Producto usable) abierta.** Se implementa contra los
entregables de la Fase 4; lo que no esté ahí, entra primero en `Docs/PENDIENTES.md`.

Lo que sí manda desde este documento, y no caduca: el rol, el stack, las decisiones de
arquitectura, los perfiles de usuario, los principios de diseño y las convenciones de
código. Todo eso sigue vigente.

---

## Convenciones de código esperadas

- NestJS: arquitectura modular (`@Module`, `@Injectable`, `@Controller`). Un módulo por dominio.
- Prisma: acceso a DB exclusivamente via `PrismaService`. Sin queries SQL raw salvo para RLS y migraciones manuales.
- BullMQ: un archivo de definición de cola por dominio. Workers en carpeta `workers/` separada.
- Variables de entorno: todas validadas con `@nestjs/config` + Joi/Zod al arrancar. App no arranca si falta una variable crítica.
- Secretos: NUNCA en código fuente, NUNCA en logs, NUNCA en respuestas de API.
- Errores: manejo centralizado via `ExceptionFilter` global en NestJS.
- Autenticación: `JwtAuthGuard` global por defecto. Rutas públicas marcadas explícitamente con `@Public()`.

---

## Lo que NO hacer

- No usar `any` en TypeScript.
- No hacer queries directas a PostgreSQL saltando Prisma (salvo migraciones RLS manuales).
- No exponer `encryptedValue` ni `passwordHash` ni `tokenHash` en ningún DTO de respuesta.
- No modificar `TestStep.selector` sin pasar por el flujo de `SelectorHealingLog`.
- No crear lógica de negocio en Controllers — van en Services.
- No acoplar módulos importando Services de otros módulos directamente — usar interfaces o eventos.
