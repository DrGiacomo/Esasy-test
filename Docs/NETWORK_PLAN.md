# NETWORK PLAN — Plano de Red y Protocolo WebSocket/CDP

> **Estado del proyecto:** vive en [`PROJECT_CONTEXT.md`](PROJECT_CONTEXT.md) §6 — este
> documento no declara fase.  
> **Versión del documento:** 1.0.0 · entregable de la Fase 1, cerrada el 2026-05-25  
> **Última revisión:** 2026-09-04

---

## 1. Topología General de Red

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENTE (Browser)                           │
│                                                                     │
│  ┌──────────────────┐   ┌───────────────────┐   ┌───────────────┐  │
│  │  RecorderPage    │   │ ExecutionDetail   │   │  FlowEditor   │  │
│  │  (canvas CDP)    │   │ (progress live)   │   │  (REST CRUD)  │  │
│  └────────┬─────────┘   └────────┬──────────┘   └──────┬────────┘  │
│           │ WS /recorder         │ WS /executions       │ REST      │
└───────────┼──────────────────────┼──────────────────────┼───────────┘
            │                      │                       │
            ▼                      ▼                       ▼
┌─────────────────────────────────────────────────────────────────────┐
│                     BACKEND API (NestJS :3000)                      │
│                                                                     │
│  RecorderGateway    ExecutionsGateway    REST Controllers           │
│  (socket.io ns)     (socket.io ns)       (auth, projects,           │
│                                           tests, executions...)     │
│                                                                     │
│  ┌───────────────┐  ┌─────────────────┐  ┌──────────────────────┐  │
│  │RecorderService│  │ExecutionService │  │  PrismaService       │  │
│  │(sesiones act.)│  │(BullMQ producer)│  │  VaultService        │  │
│  └──────┬────────┘  └────────┬────────┘  └──────────────────────┘  │
│         │ WS CDP             │ BullMQ job                           │
└─────────┼────────────────────┼─────────────────────────────────────┘
          │                    │
          │              ┌─────▼──────┐     ┌─────────────────────────┐
          │              │   Redis    │◄────►│  BullMQ Worker Process  │
          │              │  :6379     │      │  (Node.js standalone)   │
          │              │ (BullMQ +  │      │                         │
          │              │  pub/sub)  │      │  execution.processor.ts │
          │              └─────┬──────┘      │  docker.service.ts      │
          │                    │ pub/sub      └─────────┬───────────────┘
          │                    │ events                 │ dockerode API
          │              ┌─────▼──────┐                │
          │              │  Backend   │                 │
          │              │  Gateway   │                 │
          │              │ (subscribe)│                 │
          │              └────────────┘                 │
          │                                             │
          ▼                                             ▼
┌─────────────────────────┐              ┌─────────────────────────────┐
│  Recorder Container     │              │  Execution Container(s)     │
│  (Docker efímero)       │              │  (Docker efímero por job)   │
│                         │              │                             │
│  Playwright CDP Server  │              │  Playwright Core            │
│  :9222 (interno)        │              │  (ejecuta TestSteps)        │
│                         │              │                             │
│  cdp-listener.ts        │              │  Artefactos:                │
│  frame-streamer.ts      │              │  /artifacts/screenshots/    │
│  action-executor.ts     │              │  /artifacts/videos/         │
└──────────┬──────────────┘              │  /artifacts/traces/         │
           │ CDP                         └─────────────────────────────┘
           ▼
┌─────────────────────────┐
│  Aplicación bajo prueba │
│  (URL del proyecto)     │
└─────────────────────────┘
```

---

## 2. Flujo 1 — Grabación Remota (CDP Stream)

### 2.1 Ciclo de vida de una sesión

```
Frontend                Backend API           Recorder Container     Target App
   │                        │                        │                   │
   │  POST /recorder/       │                        │                   │
   │  sessions              │                        │                   │
   │ { projectId, url } ───►│                        │                   │
   │                        │── docker run ─────────►│                   │
   │                        │   (recorder image)     │                   │
   │                        │                        │── CDP connect ───►│
   │◄── { sessionId,        │◄── WS CDP connect ─────│                   │
   │     status: READY }    │    ws://recorder-       │                   │
   │                        │    <id>:9222            │                   │
   │                        │                        │                   │
   │── WS connect ─────────►│                        │                   │
   │   /recorder            │                        │                   │
   │   emit('session:join') │                        │                   │
   │   { sessionId }        │                        │                   │
   │                        │                        │                   │
   │                        │◄── frame (JPEG buf) ───│◄── render ────────│
   │◄── emit('frame') ──────│                        │                   │
   │   { data, timestamp }  │                        │                   │
   │   [canvas.drawImage]   │                        │                   │
   │                        │                        │                   │
   │── emit('action:        │                        │                   │
   │   perform') ──────────►│── CDP command ────────►│                   │
   │  { type:'click',       │                        │── page.click() ──►│
   │    x, y, selector }    │                        │                   │
   │                        │◄── action confirmed ───│                   │
   │◄── emit('action:       │                        │                   │
   │   captured')           │                        │                   │
   │   { step: TestStepDto }│                        │                   │
   │                        │                        │                   │
   │── POST /recorder/      │                        │                   │
   │   sessions/:id/stop ──►│── docker stop ────────►│                   │
   │                        │                        │── graceful exit   │
   │◄── { steps:            │                        │                   │
   │     TestStep[] }       │                        │                   │
```

### 2.2 Estrategia de buffer de frames (latencia < 2s)

| Parámetro | Valor | Motivo |
|---|---|---|
| Captura CDP | 10 fps (100ms) | Balance calidad/ancho de banda |
| Formato | JPEG quality 70 | ~15KB por frame — aceptable en LAN |
| Transporte | WebSocket binary frames | Evita overhead de base64 (33% más datos) |
| Buffer backend | máx 3 frames en cola | Si el cliente no consume, descartar intermedios |
| Política de drop | Keep-latest | El frame más reciente siempre llega; se descartan los viejos |
| Render cliente | `<canvas>` + `createImageBitmap()` | No-blocking, async decode |
| Latencia objetivo | < 2s end-to-end | Captura (100ms) + WS relay (< 50ms LAN) + render (< 50ms) |

### 2.3 Protocolo de acciones del usuario → CDP

El Frontend traduce eventos del DOM del canvas a comandos normalizados:

```
Evento DOM (canvas)          ActionEvent enviado al backend
──────────────────────────   ────────────────────────────────────────────
click en coordenadas         { type: 'click', x: 340, y: 220 }
dblclick                     { type: 'dblclick', x: 340, y: 220 }
input en overlay             { type: 'fill', selector: '...', value: 'texto' }
keypress Enter               { type: 'press', key: 'Enter' }
URL bar submit               { type: 'navigate', url: 'https://...' }
hover                        { type: 'hover', x: 340, y: 220 }
```

El Backend convierte el `ActionEvent` al comando CDP correspondiente y lo ejecuta en el Recorder Container vía `page.click()`, `page.fill()`, `page.goto()`, etc.

---

## 3. Flujo 2 — Ejecución de Tests en Tiempo Real

### 3.1 Ciclo de vida de una ejecución

```
Frontend              Backend API           Redis          BullMQ Worker      Docker Container
   │                      │                   │                 │                    │
   │ POST /executions ───►│                   │                 │                    │
   │ { projectId }        │── INSERT ─────────│                 │                    │
   │                      │  Execution(QUEUED)│                 │                    │
   │◄── { executionId,    │── BullMQ.add() ──►│                 │                    │
   │     status:QUEUED }  │                   │── job ─────────►│                    │
   │                      │                   │                 │                    │
   │── WS connect ───────►│                   │                 │                    │
   │   /executions        │                   │                 │                    │
   │   emit('execution:   │                   │                 │                    │
   │   subscribe')        │                   │                 │                    │
   │   { executionId }    │── JOIN room ──────│                 │                    │
   │                      │   execution:<id>  │                 │                    │
   │                      │                   │                 │                    │
   │                      │                   │◄── UPDATE ──────│                    │
   │                      │                   │  status:        │── docker run ─────►│
   │                      │                   │  PROVISIONING   │                    │
   │◄── emit(execution:   │◄── pub/sub ───────│                 │                    │
   │   status)            │                   │                 │                    │
   │   { PROVISIONING }   │── to room ───────►│                 │── PW launch ──────►│
   │                      │                   │                 │                    │
   │                      │                   │◄── UPDATE ──────│                    │
   │◄── emit(execution:   │◄── pub/sub ───────│  status:RUNNING │                    │
   │   status)            │                   │                 │                    │
   │   { RUNNING }        │                   │                 │                    │
   │                      │                   │                 │                    │
   │                      │                   │◄── step done ───│◄── step exec ──────│
   │◄── emit(execution:   │◄── pub/sub ───────│  StepResult     │                    │
   │   step-result)       │                   │  INSERT         │                    │
   │   { stepId, PASSED } │                   │                 │                    │
   │                      │                   │                 │                    │
   │                      │                   │◄── test done ───│                    │
   │◄── emit(execution:   │◄── pub/sub ───────│  ExecutionResult│                    │
   │   test-result)       │                   │  INSERT         │                    │
   │   { testId, FAILED } │                   │                 │                    │
   │                      │                   │                 │                    │
   │                      │                   │◄── UPDATE ──────│── artefactos ──────│
   │◄── emit(execution:   │◄── pub/sub ───────│  status:        │   recopilados      │
   │   status)            │                   │  COLLECTING     │                    │
   │   { COLLECTING }     │                   │                 │                    │
   │                      │                   │                 │── docker stop ────►│
   │                      │                   │◄── UPDATE ──────│                    │
   │◄── emit(execution:   │◄── pub/sub ───────│  status:        │                    │
   │   completed)         │                   │  COMPLETED      │                    │
   │   { summary }        │                   │                 │                    │
```

### 3.2 Canal Redis pub/sub para eventos de ejecución

- **Canal:** `execution:<executionId>:events`
- **Publicador:** BullMQ Worker (escribe directamente en Redis)
- **Suscriptor:** `ExecutionsGateway` en el Backend API (re-emite a WS rooms)

Esto desacopla el worker del gateway — el worker no necesita saber que existe WebSocket.

---

## 4. Catálogo de Eventos WebSocket

### 4.1 Namespace `/recorder`

**Autenticación:** JWT en handshake (`{ auth: { token } }`)

#### Cliente → Servidor

| Evento | Payload | Descripción |
|---|---|---|
| `session:join` | `{ sessionId: string }` | Unirse a la room de la sesión |
| `action:perform` | `RecorderActionEvent` | Ejecutar una acción sobre la app remota |

```typescript
// RecorderActionEvent
interface RecorderActionEvent {
  sessionId: string;
  type: 'click' | 'dblclick' | 'fill' | 'press' | 'navigate' | 'hover' | 'select';
  x?: number;          // coordenadas en canvas (para click/hover)
  y?: number;
  selector?: string;   // selector CDP (para fill/select)
  value?: string;      // texto para fill, URL para navigate
  key?: string;        // tecla para press
}
```

#### Servidor → Cliente

| Evento | Payload | Descripción |
|---|---|---|
| `frame` | `FrameEvent` | Frame JPEG del stream CDP |
| `action:captured` | `{ sessionId, step: TestStepDto }` | Paso registrado tras acción exitosa |
| `session:error` | `{ sessionId, message: string }` | Error en la sesión |
| `session:ended` | `{ sessionId, capturedSteps: TestStepDto[] }` | Sesión terminada, pasos finales |

```typescript
// FrameEvent — transporte binary WebSocket
interface FrameEvent {
  sessionId: string;
  timestamp: number;   // Date.now() en el container
  data: Buffer;        // JPEG binary
}
```

---

### 4.2 Namespace `/executions`

**Autenticación:** JWT en handshake (`{ auth: { token } }`)

#### Cliente → Servidor

| Evento | Payload | Descripción |
|---|---|---|
| `execution:subscribe` | `{ executionId: string }` | Empezar a recibir eventos de una ejecución |
| `execution:unsubscribe` | `{ executionId: string }` | Dejar de recibir eventos |

#### Servidor → Cliente

| Evento | Payload | Descripción |
|---|---|---|
| `execution:status` | `ExecutionStatusEvent` | Cambio de estado de la ejecución |
| `execution:test-result` | `TestResultEvent` | Resultado de un test individual |
| `execution:step-result` | `StepResultEvent` | Resultado de un paso individual |
| `execution:completed` | `ExecutionSummaryEvent` | Ejecución finalizada con resumen |
| `execution:error` | `{ executionId, message }` | Error no recuperable |

```typescript
interface ExecutionStatusEvent {
  executionId: string;
  status: ExecutionStatus;  // QUEUED | PROVISIONING | RUNNING | COLLECTING | COMPLETED | FAILED | CANCELLED
  timestamp: number;
}

interface TestResultEvent {
  executionId: string;
  testId: string;
  testName: string;
  status: 'COMPLETED' | 'FAILED';
  durationMs: number;
  screenshotUrl?: string;
}

interface StepResultEvent {
  executionId: string;
  stepId: string;
  stepOrder: number;
  status: StepResultStatus;  // PASSED | FAILED | SKIPPED
  durationMs: number;
  screenshotUrl?: string;
  errorDetails?: string;
}

interface ExecutionSummaryEvent {
  executionId: string;
  status: 'COMPLETED' | 'FAILED';
  summary: {
    total: number;
    passed: number;
    failed: number;
    skipped: number;
    durationMs: number;
    reportUrl: string;
  };
}
```

---

## 5. Reconexión y Resiliencia

### 5.1 Frontend — socket.io-client config

```typescript
// lib/socket/socket.client.ts
const socket = io(BACKEND_URL, {
  auth: { token: getAccessToken() },
  reconnection: true,
  reconnectionAttempts: 5,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 5000,
});

// Al reconectar: re-suscribirse a rooms activas
socket.on('reconnect', () => {
  activeExecutionIds.forEach(id => {
    socket.emit('execution:subscribe', { executionId: id });
  });
});
```

### 5.2 Sesión de grabación tras reconexión

Si el cliente se desconecta durante una grabación:
1. El Recorder Container sigue activo (no se mata automáticamente)
2. El Frontend intenta reconectar (5 intentos, backoff exponencial)
3. Al reconectar, emite `session:join` con el `sessionId` original
4. El Backend verifica que la sesión esté activa en `RecorderService` y reanuda el stream
5. Si no hay reconexión en 30s: Backend destruye el container y marca la sesión como `EXPIRED`

### 5.3 Worker — manejo de fallo de container Docker

```
Job BullMQ (execution worker)
├── Si docker run falla → UPDATE execution.status = FAILED, errorMessage
├── Si container muere mid-execution → Worker detecta via exit code
│   ├── exit code 0 → COLLECTING → COMPLETED
│   └── exit code != 0 → FAILED + errorMessage = stderr
└── Si worker process muere → BullMQ retoma el job (maxAttempts: 2)
    └── Segunda ejecución verifica estado en DB antes de continuar
```

---

## 6. Red Docker Compose

```yaml
# Topología de red — todos los servicios en la misma red interna
networks:
  e2e-net:
    driver: bridge

services:
  postgres:
    networks: [e2e-net]
    # Solo accesible internamente — no exponer puerto en producción

  redis:
    networks: [e2e-net]
    # Solo accesible por backend y worker

  backend:
    networks: [e2e-net]
    ports: ["3000:3000"]  # Único servicio con puerto expuesto al host
    environment:
      - REDIS_URL=redis://redis:6379
      - DATABASE_URL=postgresql://...@postgres:5432/e2e

  worker:
    networks: [e2e-net]
    # Sin puerto expuesto — consume BullMQ de Redis
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock  # Para spawn de containers
      - artifacts:/artifacts

  # Los Recorder Containers y Execution Containers se crean dinámicamente
  # por docker.service.ts usando dockerode — se conectan a e2e-net en runtime:
  #   docker.createContainer({ NetworkingConfig: { EndpointsConfig: { 'e2e-net': {} } } })
```

### 6.1 Naming convention de containers dinámicos

| Tipo | Nombre | Tiempo de vida |
|---|---|---|
| Recorder | `recorder-<sessionId>` | Duración de la sesión (~minutos) |
| Execution | `exec-<executionId>` | Duración del job (~segundos/minutos) |

El `RecorderService` y `docker.service.ts` guardan el `containerId` en DB para poder hacer `docker stop` en limpieza.

---

## 7. Resumen de Puertos y Endpoints

### 7.1 Backend REST API

| Dominio | Prefijo | Métodos principales |
|---|---|---|
| Auth | `/auth` | POST register, login, refresh, logout |
| Organizations | `/organizations` | CRUD + members |
| Projects | `/projects` | CRUD |
| Test Suites | `/projects/:id/suites` | CRUD |
| Tests | `/suites/:id/tests` | CRUD + steps + versions |
| Executions | `/executions` | POST trigger, GET, DELETE cancel |
| Recorder | `/recorder/sessions` | POST start, DELETE stop |
| AI | `/ai` | POST chat, codegen, nl-to-flow, heal |
| Git | `/git/integrations` | CRUD + POST sync |
| Secrets | `/secrets` | CRUD |
| Reports | `/reports/:executionId` | GET |

### 7.2 WebSocket Namespaces

| Namespace | Autenticación | Propósito |
|---|---|---|
| `/recorder` | JWT handshake | Stream CDP + relay de acciones |
| `/executions` | JWT handshake | Progreso en tiempo real de ejecuciones |

### 7.3 Puertos de servicios

| Servicio | Puerto interno | Puerto host (dev) |
|---|---|---|
| Backend API | 3000 | 3000 |
| PostgreSQL | 5432 | 5432 |
| Redis | 6379 | 6379 |
| Recorder Container | 9222 (CDP) | — (solo interno) |
| Worker | — | — |

---

## 8. Variables de Entorno Requeridas

```bash
# Backend API + Worker (validadas con Joi al arrancar — app no inicia si falta una)

DATABASE_URL=postgresql://user:pass@postgres:5432/e2e_platform
REDIS_URL=redis://redis:6379
JWT_SECRET=<mínimo 64 chars aleatorios>
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
VAULT_ENCRYPTION_KEY=<AES-256 key — 32 bytes hex>
DEEPSEEK_API_KEY=<clave de DeepSeek API>
DEEPSEEK_BASE_URL=https://api.deepseek.com
DOCKER_NETWORK=e2e-net
RECORDER_IMAGE=e2e-platform/recorder:latest
EXECUTION_IMAGE=e2e-platform/executor:latest
ARTIFACTS_VOLUME_PATH=/artifacts
PORT=3000
NODE_ENV=development
```

---

## 9. Checklist de Cierre — Fase 1

> **Registro histórico, no estado actual.** La Fase 1 se cerró el **2026-05-25** (`45d5597`).
> Las fases 2 y 3 también están cerradas y la 4 está abierta — ver `PROJECT_CONTEXT.md` §6.

| Entregable | Estado |
|---|---|
| `schema.prisma` completo | ✅ |
| Estructura de carpetas (Frontend + Backend) | ✅ |
| Plano de red y protocolo WebSocket/CDP | ✅ |
| **Fase 1 COMPLETA → Fase 2 desbloqueada** | ✅ |
