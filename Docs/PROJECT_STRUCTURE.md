# PROJECT STRUCTURE — Fase 1 Entregable 2

> 📖 **Manda sobre este documento: [`BIBLIA_PROYECTO.md`](BIBLIA_PROYECTO.md).** Si algo de
> aquí la contradice, o se actualiza la biblia, o se descarta lo de aquí.

> **Estado del proyecto:** vive en [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) §6 — este
> documento no declara fase.  
> **Versión del documento:** 1.0.0 · entregable de la Fase 1, cerrada el 2026-05-25  
> **Última revisión:** 2026-09-04

---

## Raíz del Monorepo

```
/ (monorepo root)
├── backend/
├── frontend/
├── docker-compose.yml          # PostgreSQL + Redis + Backend API + Worker + Recorder
├── docker-compose.dev.yml      # Override dev: hot reload, puertos expuestos
├── .env.example
└── prisma/
    ├── schema.prisma           # YA EXISTE — no modificar
    └── migrations/
        └── rls/
            └── 001_rls_policies.sql  # Políticas RLS — ESCRITAS Y SIN APLICAR (nadie las ejecuta)
```

---

## Backend (NestJS + TypeScript)

```
backend/
├── src/
│   ├── main.ts                               # Bootstrap: global pipes, guards, filters, prefix
│   ├── app.module.ts                         # Root module — importa todos los feature modules
│   │
│   ├── prisma/
│   │   ├── prisma.module.ts                  # Global module
│   │   └── prisma.service.ts                 # PrismaClient + onModuleInit/Destroy
│   │
│   ├── common/
│   │   ├── decorators/
│   │   │   ├── public.decorator.ts           # @Public() — bypass JwtAuthGuard
│   │   │   ├── current-user.decorator.ts     # @CurrentUser() — extrae user del request
│   │   │   └── roles.decorator.ts            # @Roles(MemberRole.ADMIN) — para RoleGuard
│   │   │
│   │   ├── filters/
│   │   │   └── global-exception.filter.ts    # ExceptionFilter global — formato unificado de errores
│   │   │
│   │   ├── guards/
│   │   │   ├── jwt-auth.guard.ts             # Guard global — activo por defecto en toda la app
│   │   │   └── role.guard.ts                 # Verifica MemberRole en Membership table por request
│   │   │
│   │   ├── interceptors/
│   │   │   └── rls.interceptor.ts            # SET LOCAL app.current_org_id = '<uuid>' por request
│   │   │
│   │   ├── interfaces/
│   │   │   ├── jwt-payload.interface.ts      # { sub: userId, orgId, role }
│   │   │   ├── ai-provider.interface.ts      # Contrato provider-agnostic para AI Engine
│   │   │   └── git-provider.interface.ts     # Contrato provider-agnostic para Git
│   │   │
│   │   ├── pipes/
│   │   │   └── zod-validation.pipe.ts        # ValidationPipe con Zod
│   │   │
│   │   └── types/
│   │       └── express.d.ts                  # Extiende Request: user, orgId, memberRole
│   │
│   ├── infrastructure/
│   │   ├── config/
│   │   │   └── config.schema.ts              # Joi schema: DATABASE_URL, JWT_SECRET, REDIS_URL,
│   │   │                                     # DEEPSEEK_API_KEY, VAULT_KEY, PORT — app no arranca
│   │   │                                     # si falta una variable crítica
│   │   └── vault/
│   │       ├── vault.module.ts               # Global module
│   │       └── vault.service.ts              # Wrapper AES-256 — impl: env var key o HashiCorp Vault
│   │
│   ├── modules/
│   │   │
│   │   ├── auth/                             # Dominio: autenticación y tokens
│   │   │   ├── auth.module.ts
│   │   │   ├── auth.controller.ts            # POST /auth/register
│   │   │   │                                 # POST /auth/login
│   │   │   │                                 # POST /auth/refresh
│   │   │   │                                 # POST /auth/logout
│   │   │   ├── auth.service.ts               # Bcrypt, JWT sign, refresh token rotation
│   │   │   ├── strategies/
│   │   │   │   └── jwt.strategy.ts           # PassportJS JWT strategy
│   │   │   └── dto/
│   │   │       ├── register.dto.ts
│   │   │       ├── login.dto.ts
│   │   │       └── auth-tokens.dto.ts        # { accessToken, refreshToken, expiresIn }
│   │   │
│   │   ├── organizations/                    # Dominio: multi-tenancy raíz
│   │   │   ├── organizations.module.ts
│   │   │   ├── organizations.controller.ts   # POST /organizations
│   │   │   │                                 # GET  /organizations/:id
│   │   │   │                                 # PATCH /organizations/:id
│   │   │   │                                 # POST /organizations/:id/members
│   │   │   │                                 # PATCH /organizations/:id/members/:userId
│   │   │   │                                 # DELETE /organizations/:id/members/:userId
│   │   │   ├── organizations.service.ts
│   │   │   ├── memberships.service.ts        # Gestión de membresías y validación de roles
│   │   │   └── dto/
│   │   │       ├── create-organization.dto.ts
│   │   │       ├── update-organization.dto.ts
│   │   │       ├── invite-member.dto.ts
│   │   │       ├── update-member-role.dto.ts
│   │   │       └── organization-response.dto.ts  # Sin campos sensibles
│   │   │
│   │   ├── projects/                         # Dominio: proyectos de testing
│   │   │   ├── projects.module.ts
│   │   │   ├── projects.controller.ts        # CRUD /projects
│   │   │   ├── projects.service.ts
│   │   │   └── dto/
│   │   │       ├── create-project.dto.ts
│   │   │       ├── update-project.dto.ts
│   │   │       └── project-response.dto.ts
│   │   │
│   │   ├── test-suites/                      # Dominio: agrupador de tests
│   │   │   ├── test-suites.module.ts
│   │   │   ├── test-suites.controller.ts     # CRUD /projects/:projectId/suites
│   │   │   ├── test-suites.service.ts
│   │   │   └── dto/
│   │   │       ├── create-test-suite.dto.ts
│   │   │       └── test-suite-response.dto.ts
│   │   │
│   │   ├── tests/                            # Dominio: tests, pasos y versiones
│   │   │   ├── tests.module.ts
│   │   │   ├── tests.controller.ts           # CRUD /suites/:suiteId/tests
│   │   │   │                                 # GET  /tests/:id/versions
│   │   │   │                                 # GET  /tests/:id/versions/:versionNumber
│   │   │   │                                 # POST /tests/:id/steps
│   │   │   │                                 # PATCH /tests/:id/steps/:stepId
│   │   │   │                                 # PUT  /tests/:id/steps/reorder
│   │   │   │                                 # DELETE /tests/:id/steps/:stepId
│   │   │   ├── tests.service.ts
│   │   │   ├── test-steps.service.ts         # CRUD de pasos — pasa por versioning antes de modificar
│   │   │   ├── test-versions.service.ts      # Crea snapshot inmutable JSONB antes de modificaciones
│   │   │   └── dto/
│   │   │       ├── create-test.dto.ts
│   │   │       ├── update-test.dto.ts
│   │   │       ├── create-step.dto.ts
│   │   │       ├── update-step.dto.ts
│   │   │       ├── reorder-steps.dto.ts      # [{ stepId, order }]
│   │   │       ├── test-response.dto.ts
│   │   │       └── test-version-response.dto.ts
│   │   │
│   │   ├── executions/                       # Dominio: ejecuciones de tests
│   │   │   ├── executions.module.ts
│   │   │   ├── executions.controller.ts      # POST /executions (trigger)
│   │   │   │                                 # GET  /executions/:id
│   │   │   │                                 # GET  /executions/:id/results
│   │   │   │                                 # DELETE /executions/:id (cancel)
│   │   │   ├── executions.service.ts         # Crea Execution en DB + encola en BullMQ
│   │   │   ├── executions.gateway.ts         # @WebSocketGateway — emite eventos de progreso
│   │   │   │                                 # Eventos: execution:status, execution:step-result
│   │   │   ├── queues/
│   │   │   │   └── execution.queue.ts        # BullMQ Queue definition + JobData types
│   │   │   └── dto/
│   │   │       ├── trigger-execution.dto.ts  # { projectId, suiteId? }
│   │   │       └── execution-response.dto.ts
│   │   │
│   │   ├── recorder/                         # Dominio: grabación remota vía CDP
│   │   │   ├── recorder.module.ts
│   │   │   ├── recorder.controller.ts        # POST /recorder/sessions (start)
│   │   │   │                                 # DELETE /recorder/sessions/:id (stop)
│   │   │   ├── recorder.service.ts           # Gestiona sesiones activas — spawn/kill containers
│   │   │   ├── recorder.gateway.ts           # @WebSocketGateway — relay del stream CDP al frontend
│   │   │   │                                 # Eventos: frame, action-captured, session-ended
│   │   │   ├── recorder-session.ts           # Clase: { containerId, wsConnection, frameBuffer }
│   │   │   └── dto/
│   │   │       ├── start-recording.dto.ts    # { projectId, targetUrl }
│   │   │       └── recorder-event.dto.ts     # Payload normalizado de eventos CDP
│   │   │
│   │   ├── ai/                               # Dominio: AI Engine
│   │   │   ├── ai.module.ts
│   │   │   ├── ai.controller.ts              # POST /ai/chat
│   │   │   │                                 # POST /ai/codegen
│   │   │   │                                 # POST /ai/nl-to-flow
│   │   │   │                                 # POST /ai/heal/:stepId (propone fix)
│   │   │   │                                 # POST /ai/heal/:healingLogId/approve
│   │   │   │                                 # POST /ai/heal/:healingLogId/reject
│   │   │   ├── ai.service.ts                 # Orquestador — delega a sub-services por operationType
│   │   │   │
│   │   │   ├── providers/
│   │   │   │   ├── ai-provider.interface.ts  # Interface: complete(prompt): Promise<AiResponse>
│   │   │   │   └── deepseek.provider.ts      # Implementación con DeepSeek API + retry logic
│   │   │   │
│   │   │   ├── operations/
│   │   │   │   ├── codegen.service.ts        # semanticModel JSON → TypeScript POM
│   │   │   │   ├── self-healing.service.ts   # Selector roto → propuesta → SelectorHealingLog PENDING
│   │   │   │   ├── nl-to-flow.service.ts     # Texto libre → semanticModel JSON
│   │   │   │   ├── documentation.service.ts  # Test steps → descripción legible No-Code
│   │   │   │   └── chat.service.ts           # Agente contextual con historial
│   │   │   │
│   │   │   ├── prompts/
│   │   │   │   ├── codegen.prompt.ts         # Template del prompt para generación de código
│   │   │   │   ├── self-healing.prompt.ts
│   │   │   │   ├── nl-to-flow.prompt.ts
│   │   │   │   └── documentation.prompt.ts
│   │   │   │
│   │   │   ├── audit/
│   │   │   │   └── ai-audit.service.ts       # Escribe en AiAuditLog — llamado por cada operation
│   │   │   │
│   │   │   └── dto/
│   │   │       ├── chat-request.dto.ts
│   │   │       ├── codegen-request.dto.ts    # { testId } — lee semanticModel internamente
│   │   │       ├── nl-to-flow-request.dto.ts # { prompt: string }
│   │   │       └── healing-review.dto.ts     # { rejectionReason?: string }
│   │   │
│   │   ├── git/                              # Dominio: integración Git
│   │   │   ├── git.module.ts
│   │   │   ├── git.controller.ts             # POST /git/integrations
│   │   │   │                                 # GET  /git/integrations
│   │   │   │                                 # DELETE /git/integrations/:id
│   │   │   │                                 # POST /git/sync/:testId
│   │   │   ├── git.service.ts
│   │   │   ├── providers/
│   │   │   │   ├── github.provider.ts        # Implementa git-provider.interface.ts
│   │   │   │   └── gitlab.provider.ts
│   │   │   └── dto/
│   │   │       ├── create-git-integration.dto.ts
│   │   │       └── git-integration-response.dto.ts  # Sin encryptedToken
│   │   │
│   │   ├── secrets/                          # Dominio: gestión de secretos
│   │   │   ├── secrets.module.ts
│   │   │   ├── secrets.controller.ts         # CRUD /secrets — NUNCA expone encryptedValue
│   │   │   ├── secrets.service.ts            # Cifra via VaultService antes de persistir
│   │   │   └── dto/
│   │   │       ├── create-secret.dto.ts
│   │   │       ├── update-secret.dto.ts
│   │   │       └── secret-response.dto.ts    # { id, name, type, description } — sin value
│   │   │
│   │   └── reports/                          # Dominio: generación de reportes
│   │       ├── reports.module.ts
│   │       ├── reports.controller.ts         # GET /reports/:executionId
│   │       ├── reports.service.ts            # Agrega ExecutionResult + StepResult + artefactos
│   │       └── templates/
│   │           └── execution-report.hbs      # Handlebars — reporte HTML con screenshots y trazas
│   │
│   └── workers/                              # BullMQ processors — proceso Node.js separado del API
│       ├── bootstrap-worker.ts               # Entry point: node dist/workers/bootstrap-worker.js
│       ├── worker.module.ts                  # NestJS module standalone para workers
│       └── execution/
│           ├── execution.processor.ts        # @Processor('execution') — ciclo QUEUED→COMPLETED/FAILED
│           ├── docker.service.ts             # Spawn/kill contenedores Docker efímeros vía dockerode
│           └── artifact-collector.service.ts # Post-ejecución: recopila video, screenshots, trace.zip
│
├── test/
│   ├── e2e/                                  # Tests integration con supertest
│   └── unit/                                 # Tests unitarios por módulo
│
├── docker/
│   ├── Dockerfile                            # API server (node:20-alpine, multi-stage)
│   ├── Dockerfile.worker                     # Worker process — misma base, distinto entry point
│   └── Dockerfile.recorder                   # Recorder container: Playwright + CDP listener
│
├── .env.example
├── nest-cli.json
├── package.json
└── tsconfig.json
```

---

## Frontend (React + Vite + TypeScript)

```
frontend/
├── src/
│   ├── main.tsx                              # ReactDOM.createRoot + providers
│   ├── App.tsx                               # Router root
│   │
│   ├── features/                             # Un directorio por dominio — autónomo
│   │   │
│   │   ├── auth/
│   │   │   ├── pages/
│   │   │   │   ├── LoginPage.tsx
│   │   │   │   └── RegisterPage.tsx
│   │   │   ├── components/
│   │   │   │   └── AuthForm.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useAuth.ts
│   │   │   └── auth.api.ts
│   │   │
│   │   ├── projects/
│   │   │   ├── pages/
│   │   │   │   ├── ProjectsListPage.tsx
│   │   │   │   └── ProjectDetailPage.tsx     # Lista suites del proyecto
│   │   │   ├── components/
│   │   │   │   ├── ProjectCard.tsx
│   │   │   │   └── CreateProjectModal.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useProjects.ts
│   │   │   └── projects.api.ts
│   │   │
│   │   ├── tests/
│   │   │   ├── pages/
│   │   │   │   ├── TestsListPage.tsx
│   │   │   │   └── TestDetailPage.tsx        # Vista de pasos + versiones
│   │   │   ├── components/
│   │   │   │   ├── TestCard.tsx
│   │   │   │   └── StepList.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useTests.ts
│   │   │   └── tests.api.ts
│   │   │
│   │   ├── flow-editor/                      # Editor visual low-code (diagrama de bloques)
│   │   │   ├── pages/
│   │   │   │   └── FlowEditorPage.tsx        # Layout: Palette | Canvas | Inspector
│   │   │   ├── components/
│   │   │   │   ├── FlowCanvas.tsx            # Área principal drag & drop de bloques
│   │   │   │   ├── StepBlock.tsx             # Bloque individual de un TestStep
│   │   │   │   ├── StepBlockPalette.tsx      # Panel izquierdo: tipos de pasos disponibles
│   │   │   │   ├── StepInspector.tsx         # Panel derecho: edita props del bloque seleccionado
│   │   │   │   └── CodePreviewPanel.tsx      # Panel opt-in: muestra TypeScript POM (power users)
│   │   │   └── hooks/
│   │   │       ├── useFlowEditor.ts          # Estado del canvas y selección
│   │   │       └── useDragDrop.ts
│   │   │
│   │   ├── recorder/                         # Interfaz de grabación remota
│   │   │   ├── pages/
│   │   │   │   └── RecorderPage.tsx          # Layout: RemoteBrowser | Toolbar | Captured steps
│   │   │   ├── components/
│   │   │   │   ├── RemoteBrowserFrame.tsx    # Renderiza el stream de frames CDP del backend
│   │   │   │   ├── RecorderToolbar.tsx       # Start/Stop/Pause + barra de URL
│   │   │   │   └── ActionFeedOverlay.tsx     # Overlay en tiempo real: muestra acción capturada
│   │   │   ├── hooks/
│   │   │   │   └── useRecorderSocket.ts      # WebSocket al Recorder Gateway
│   │   │   └── recorder.types.ts
│   │   │
│   │   ├── executions/
│   │   │   ├── pages/
│   │   │   │   ├── ExecutionsListPage.tsx
│   │   │   │   └── ExecutionDetailPage.tsx   # Progreso en vivo + resultados por test y paso
│   │   │   ├── components/
│   │   │   │   ├── ExecutionProgressPanel.tsx  # Stream tiempo real vía WebSocket
│   │   │   │   ├── TestResultCard.tsx
│   │   │   │   └── StepResultRow.tsx
│   │   │   ├── hooks/
│   │   │   │   └── useExecutionSocket.ts     # WebSocket al Executions Gateway
│   │   │   └── executions.api.ts
│   │   │
│   │   ├── ai-assistant/
│   │   │   ├── components/
│   │   │   │   ├── AiChatPanel.tsx           # Sidebar/modal de chat contextual
│   │   │   │   ├── AiChatMessage.tsx
│   │   │   │   ├── NlToFlowInput.tsx         # "Crea un test que haga login y verifique el dashboard"
│   │   │   │   └── HealingProposalCard.tsx   # Muestra propuesta self-healing — Aprobar | Rechazar
│   │   │   └── hooks/
│   │   │       └── useAiAssistant.ts
│   │   │
│   │   ├── settings/
│   │   │   ├── pages/
│   │   │   │   └── SettingsPage.tsx          # Tabs: Miembros | Secrets | Git
│   │   │   └── components/
│   │   │       ├── MembersPanel.tsx          # Lista y gestión de membresías con roles
│   │   │       ├── SecretsPanel.tsx          # CRUD secrets — sin mostrar valores
│   │   │       └── GitIntegrationPanel.tsx
│   │   │
│   │   └── reports/
│   │       ├── pages/
│   │       │   └── ReportViewerPage.tsx
│   │       └── components/
│   │           ├── ReportSummary.tsx
│   │           └── ArtifactViewer.tsx        # Embebe screenshot/video/trace del ExecutionResult
│   │
│   ├── components/                           # UI compartida — sin lógica de negocio
│   │   ├── layout/
│   │   │   ├── AppShell.tsx                  # Shell: Sidebar + Header + main content area
│   │   │   ├── Sidebar.tsx
│   │   │   └── Header.tsx
│   │   ├── ui/
│   │   │   ├── Button.tsx
│   │   │   ├── Badge.tsx
│   │   │   ├── Modal.tsx
│   │   │   ├── StatusBadge.tsx               # Mapea ExecutionStatus/TestStatus a colores/labels
│   │   │   └── LoadingSpinner.tsx
│   │   └── feedback/
│   │       ├── EmptyState.tsx
│   │       └── ErrorBoundary.tsx
│   │
│   ├── lib/
│   │   ├── api/
│   │   │   ├── axios.client.ts               # Instancia axios: baseURL, interceptors JWT + refresh
│   │   │   └── api.types.ts                  # Tipos compartidos: ApiResponse<T>, PaginatedResponse<T>
│   │   ├── socket/
│   │   │   └── socket.client.ts              # socket.io-client singleton con reconnect automático
│   │   └── auth/
│   │       └── token.storage.ts              # Access token en memory, refresh token en httpOnly cookie
│   │
│   ├── hooks/
│   │   ├── useCurrentOrg.ts                  # Org activa extraída del JWT/store
│   │   └── useCurrentUser.ts
│   │
│   ├── store/                                # Estado global — Zustand (mínimo, sin over-engineering)
│   │   ├── auth.store.ts                     # { user, accessToken, setTokens, clear }
│   │   └── org.store.ts                      # { currentOrg, setOrg }
│   │
│   ├── router/
│   │   ├── index.tsx                         # React Router v6 — rutas declarativas con lazy load
│   │   ├── ProtectedRoute.tsx                # Verifica auth + org context antes de renderizar
│   │   └── routes.ts                         # Constantes: ROUTES.PROJECTS, ROUTES.FLOW_EDITOR, etc.
│   │
│   └── types/
│       └── models.ts                         # Tipos TS mapeados 1:1 desde los modelos Prisma
│
├── public/
├── .env.example
├── vite.config.ts
├── tsconfig.json
└── package.json
```

---

## Notas de Diseño

### Por qué `workers/` vive dentro de `backend/src/` y no como paquete separado

Los workers comparten `PrismaService`, `VaultService`, tipos y DTOs con el API server. Separarlos en un paquete independiente requeriría un monorepo tool (Nx/Turborepo) que añade complejidad innecesaria en Fase 1. El entry point `bootstrap-worker.ts` levanta un proceso NestJS standalone sin el HTTP server — suficiente para aislamiento de proceso sin duplicar código.

### Por qué `operations/` dentro de `ai/`

Cada tipo de operación IA tiene un prompt diferente, lógica de construcción del contexto diferente y efectos secundarios diferentes (codegen escribe en `Test.generatedCode`, self-healing crea un `SelectorHealingLog`). Separarlos en services evita un god-service y hace cada operación testeable de forma independiente.

### Por qué `features/` en el frontend

Feature-first > layer-first para este proyecto. Cada feature tiene su propia carpeta con páginas, componentes, hooks y API client. Un desarrollador que trabaja en `recorder/` no toca nada fuera de `features/recorder/` salvo componentes UI genuinamente compartidos.

### Módulos que NO se acoplan directamente

La regla de `CLAUDE_CODE_CONTEXT.md` dice: *no importar Services de otros módulos directamente*. Los módulos se comunican vía:
- **Interfaces** en `common/interfaces/` (AI Provider, Git Provider)
- **Eventos NestJS** (`EventEmitter2`) para side-effects cross-domain (ej: execution completada → generar reporte)
- **BullMQ jobs** para comunicación asíncrona con workers


---

## Añadido después del diseño

El árbol de arriba se verificó el `2026-09-04` contra el disco: **los 11 módulos de backend
coinciden**. Lo que sigue existe en el código y este documento no lo menciona, porque nació
en las fases 2 y 3:

| Ruta | Qué es | Llegó en |
|---|---|---|
| `Backend/prisma/rls/` | Políticas Row-Level Security de Postgres. **Escritas y NO aplicadas**: están fuera de `prisma/migrations/`, así que `prisma migrate deploy` no las ve y ningún script las ejecuta. Comprobado el `2026-09-05` contra la base: 0 políticas activas | Fase 3 · `fa1d7fb` |
| `Backend/src/workers/execution/auto-healing.service.ts` | Lee el contexto del fallo que deja el executor y crea propuestas de reparación en `PENDING_APPROVAL` | Fase 3 |
| `Backend/src/workers/execution/artifact-cleanup.service.ts` | Cron diario que borra artefactos por encima de `ARTIFACTS_RETENTION_DAYS` | Fase 3 |
| `Backend/src/modules/ai/providers/` → proveedor Gemini | IA multimodal para el self-healing con imagen, bajo `VISION_PROVIDER`. Convive con DeepSeek | Fase 3 |
| `Backend/src/modules/ai/util/retry.ts` | Reintentos con backoff y jitter ante 429/5xx en los proveedores de IA | Fase 3 |
| `Backend/src/common/util/duration.ts` | Parseo de duraciones (`15m`, `24h`, `7d`) compartido por los dos sitios de `auth` que leían el mismo formato de dos maneras distintas | Fase 3 · 2026-09-04 |
| `Backend/prisma/seed.ts` | Datos de demostración: idempotente, `--borrar`, se niega ante datos reales. Excluido del build en `tsconfig.build.json` — si entra, el `rootDir` sube y `dist/main.js` se convierte en `dist/src/main.js` | Fase 4 |
| `Backend/src/modules/ai/operations/documentation.service.ts` | Documentación de un test en lenguaje llano. Al modelo no se le pasan los selectores | Fase 4 |
| `Backend/src/modules/reports/report-html.ts` | El informe en HTML autocontenido, con las capturas embebidas | Fase 4 |
| `Frontend/src/lib/describe-step.ts` · `Frontend/src/hooks/useUiMode.ts` | La frase humana de un paso y el modo del usuario. **Una sola copia**: las usan las cuatro pantallas que antes pintaban el selector crudo | Fase 4 |
| `arrancar.bat` · `parar.bat` | Arranque y parada de todo con un solo play. Comprueban antes de tocar nada y detectan el choque de puerto con un PostgreSQL nativo | Fase 5 |

> **Por qué esta sección existe y no se reescribió el árbol:** el árbol describe el diseño y
> es lo que hay que respetar al añadir código. Esta tabla dice en qué se ha desviado la
> realidad. Mezclar las dos cosas convierte el documento en un `ls` peor hecho.
