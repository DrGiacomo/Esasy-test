# GUÍA DE INSTALACIÓN — Plataforma E2E Automation con IA

> **Documento vivo** — se actualiza en cada paso del desarrollo.  
> **Última actualización:** 2026-05-26  
> **Estado del proyecto:** Verificado y funcional — Backend, Frontend y DB corriendo

---

## Elige tu ruta de instalación

| | Con Claude Code | Sin Claude Code |
|---|---|---|
| **Para quién** | Devs que quieren que la IA guíe el setup | Devs que prefieren control manual total |
| **Tiempo estimado** | ~15 minutos | ~30 minutos |
| **Riesgo de error** | Bajo — Claude detecta problemas en tiempo real | Medio — depende de seguir pasos exactos |
| **Ir a sección** | [→ Ruta A](#ruta-a--con-claude-code) | [→ Ruta B](#ruta-b--sin-claude-code) |

---

## Requisitos del sistema

> Aplica a ambas rutas. Verifica esto **antes** de empezar.

| Requisito | Versión mínima | Versión recomendada | Verificar con |
|---|---|---|---|
| Windows | 10 (64-bit) | Windows 11 Pro | `winver` |
| RAM | 8 GB | 16 GB | Task Manager |
| Disco libre | 10 GB | 20 GB | — |
| Node.js | 20 LTS | 22 LTS o 24 | `node --version` |
| npm | 9 | 11 | `npm --version` |
| Docker Desktop | 4.20 | última | Docker Desktop → About |
| Git | 2.40 | última | `git --version` |

---

## Paso 0 — Instalar prerequisitos

### 0.1 Node.js

**Descargar:** https://nodejs.org → botón **"LTS"** (no "Current")

**Instalar:** ejecutar el `.msi` descargado. Opciones por defecto. Marcar "Automatically install necessary tools" si aparece.

**Verificar en PowerShell/CMD:**
```
node --version
npm --version
```

**Debes ver algo así ✅**
```
v22.14.0
10.9.2
```

**NO debe aparecer ❌**
```
'node' is not recognized as an internal or external command
```
→ Si aparece esto: reinicia la terminal o reinstala Node.js marcando "Add to PATH".

---

### 0.2 Docker Desktop

**Descargar:** https://www.docker.com/products/docker-desktop → **"Download for Windows - AMD64"**

**Instalar:** ejecutar el instalador. En la pantalla de configuración:
- ✅ Marcar **"Use WSL 2 instead of Hyper-V"** (recomendado)
- ✅ Marcar **"Add shortcut to desktop"**

**Post-instalación:** reiniciar el equipo cuando lo pida.

**Verificar — abrir Docker Desktop y esperar que el ícono de la ballena en la barra de tareas quede verde/estático** (no animado).

Luego en terminal:
```
docker --version
docker compose version
```

**Debes ver algo así ✅**
```
Docker version 27.x.x, build xxxxxxx
Docker Compose version v2.x.x
```

**NO debe aparecer ❌**
```
error during connect: ... Is the docker daemon running?
```
→ Si aparece: abrir Docker Desktop manualmente y esperar que termine de iniciar.

---

### 0.3 Git

**Descargar:** https://git-scm.com/download/win → descarga automáticamente el instalador.

**Instalar:** opciones por defecto. En "Choosing the default editor", seleccionar VS Code si lo tienes.

**Verificar:**
```
git --version
```

**Debes ver algo así ✅**
```
git version 2.47.x.windows.x
```

---

### 0.4 NestJS CLI (global)

```
npm install -g @nestjs/cli
```

**Verificar:**
```
nest --version
```

**Debes ver algo así ✅**
```
11.x.x
```

---

## Claves de APIs externas necesarias

### DeepSeek API Key

El motor de IA del proyecto usa DeepSeek como proveedor LLM.

1. Ir a https://platform.deepseek.com
2. Crear cuenta (email o GitHub)
3. En el panel: **API Keys** → **Create new API key**
4. Copiar la clave — empieza con `sk-`
5. Guardarla en un lugar seguro, **solo la verás una vez**

**Costo:** DeepSeek tiene créditos gratuitos al registrarse. Revisar precios en https://platform.deepseek.com/docs

---

## Generar claves de seguridad internas

El proyecto requiere dos claves generadas localmente. Abre una terminal con Node y corre:

```
# JWT Secret (mínimo 32 bytes)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Vault Encryption Key (exactamente 32 bytes = 64 chars hex)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

**Debes ver algo así ✅** (valores distintos cada vez)
```
a3f8c2d1e4b5a6f7c8d9e0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1
d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3
```

Guarda estas dos claves — las usarás al configurar el `.env`.

---

---

# RUTA A — Con Claude Code

## A.1 Instalar Claude Code

**Requisito previo:** tener los prerequisitos del Paso 0 instalados.

```
npm install -g @anthropic/claude-code
```

**Verificar:**
```
claude --version
```

**Debes ver algo así ✅**
```
1.x.x
```

Iniciar sesión:
```
claude
```
→ Abrirá el navegador para autenticarse con tu cuenta de Anthropic/Claude.

**Debes ver en terminal ✅**
```
✓ Logged in as <tu-email>
```

---

## A.2 Obtener el proyecto

```
# Opción A — clonar desde Git (cuando el repo esté publicado)
git clone <url-del-repo>
cd <nombre-del-repo>

# Opción B — si ya tienes la carpeta del proyecto
cd "C:\Easy test"
```

---

## A.3 Configurar el .env

En la carpeta raíz del proyecto:

```
copy .env.example .env
```

Abre `.env` en cualquier editor y completa:

```env
JWT_SECRET=<pega aquí la primera clave generada en el Paso de claves>
VAULT_ENCRYPTION_KEY=<pega aquí la segunda clave generada>
DEEPSEEK_API_KEY=<pega aquí tu clave sk-... de DeepSeek>
```

El resto de valores pueden dejarse como están para desarrollo local.

---

## A.4 Levantar la infraestructura

```
docker compose up postgres redis -d
```

**Debes ver algo así ✅**
```
✔ Container e2e_postgres  Started
✔ Container e2e_redis     Started
```

**Verificar que están corriendo:**
```
docker ps
```

**Debes ver algo así ✅**
```
CONTAINER ID   IMAGE              STATUS          PORTS                    NAMES
xxxxxxxxxxxx   postgres:16-alpine Up x seconds    0.0.0.0:5432->5432/tcp   e2e_postgres
xxxxxxxxxxxx   redis:7-alpine     Up x seconds    0.0.0.0:6379->6379/tcp   e2e_redis
```

**NO debe aparecer ❌**
```
Error response from daemon: driver failed programming ... port is already allocated
```
→ Si aparece: el puerto está ocupado por otro proceso. Ver sección de resolución de conflictos al final.

---

## A.5 Migrar la base de datos

```
cd backend
npx prisma migrate dev --name init
```

**Debes ver algo así ✅**
```
Prisma schema loaded from prisma\schema.prisma
Datasource "db": PostgreSQL database "e2e_platform"

Applying migration `20260525000000_init`

The following migration(s) have been created and applied:

migrations/
  └─ 20260525000000_init/
    └─ migration.sql

Your database is now in sync with your schema.
```

**NO debe aparecer ❌**
```
Error: P1001: Can't reach database server at `localhost:5432`
```
→ Si aparece: el contenedor de PostgreSQL no está corriendo. Volver al paso A.4.

---

## A.6 Abrir el proyecto con Claude Code

```
cd "C:\Easy test"
claude
```

Claude Code leerá el contexto del proyecto en `Docs/` y estará listo para continuar el desarrollo desde donde se dejó.

**Desde Claude Code puedes:**
- Continuar implementando módulos: *"continúa con el módulo de auth"*
- Revisar el estado: *"¿qué falta por implementar?"*
- Levantar el servidor: *"levanta el backend en modo dev"*

---

---

# RUTA B — Sin Claude Code

## B.1 Obtener el proyecto

```
# Clonar desde Git
git clone <url-del-repo>
cd <nombre-del-repo>
```

---

## B.2 Instalar dependencias

```
# Backend
cd backend
npm install
cd ..

# Frontend
cd frontend
npm install
cd ..
```

**Debes ver algo así al final de cada npm install ✅**
```
added xxx packages, and audited xxx packages in xs
found 0 vulnerabilities
```

**NO debe aparecer ❌**
```
npm error code ERESOLVE
npm error ERESOLVE unable to resolve dependency tree
```
→ Si aparece: probar `npm install --legacy-peer-deps`

---

## B.3 Configurar el .env

```
copy .env.example .env
```

Abrir `.env` y completar los valores marcados con `CHANGE_ME`:

```env
# ── Estas TRES son obligatorias antes de arrancar ──────────────────

# Generar con: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
JWT_SECRET=<64 chars hex>

# Generar con el mismo comando de arriba (diferente valor)
VAULT_ENCRYPTION_KEY=<64 chars hex>

# De tu cuenta en https://platform.deepseek.com → API Keys
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxxxxxx

# ── Estas puedes dejarlas como están para desarrollo local ─────────
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://e2e_user:e2e_pass@localhost:5432/e2e_platform
REDIS_URL=redis://localhost:6379
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d
DEEPSEEK_BASE_URL=https://api.deepseek.com
DOCKER_NETWORK=e2e-net
RECORDER_IMAGE=e2e-platform/recorder:latest
EXECUTION_IMAGE=e2e-platform/executor:latest
ARTIFACTS_VOLUME_PATH=/artifacts
```

---

## B.4 Generar el Prisma Client

```
cd backend
npx prisma generate
```

**Debes ver algo así ✅**
```
✔ Generated Prisma Client (v5.22.0) to .\node_modules\@prisma\client in 140ms
```

---

## B.5 Levantar la infraestructura Docker

```
# Desde la raíz del proyecto (donde está docker-compose.yml)
docker compose up postgres redis -d
```

**Debes ver ✅**
```
✔ Container e2e_postgres  Started
✔ Container e2e_redis     Started
```

Verificar:
```
docker ps
```

**Debes ver ✅**
```
CONTAINER ID   IMAGE              STATUS        PORTS                    NAMES
xxxxxxxxxxxx   postgres:16-alpine Up x seconds  0.0.0.0:5432->5432/tcp   e2e_postgres
xxxxxxxxxxxx   redis:7-alpine     Up x seconds  0.0.0.0:6379->6379/tcp   e2e_redis
```

---

## B.6 Ejecutar las migraciones de base de datos

```
cd backend
npx prisma migrate dev --name init
```

**Debes ver ✅**
```
Applying migration `20260525xxxxxx_init`
Your database is now in sync with your schema.
```

> **Nota:** la primera vez creará la carpeta `prisma/migrations/`. Los archivos ahí son el historial de cambios de la DB — no borrarlos.

---

## B.7 Levantar el backend

```
cd backend
npm run start:dev
```

**Debes ver algo así ✅**
```
[Nest] LOG [NestFactory] Starting Nest application...
[Nest] LOG [InstanceLoader] ConfigModule dependencies initialized
[Nest] LOG [InstanceLoader] PrismaModule dependencies initialized
[Nest] LOG [InstanceLoader] VaultModule dependencies initialized
[Nest] LOG [RoutesResolver] ...
[Nest] LOG [NestApplication] Nest application successfully started
Backend running on http://localhost:3000/api/v1
```

**NO debe aparecer ❌**
```
Error: Config validation error: "JWT_SECRET" is required
```
→ Si aparece: el `.env` no está en la carpeta `backend/` o falta el valor. Verificar que copiaste `.env.example` como `.env` en la raíz **y** que el backend lo puede leer. Crear también `backend/.env` con el mismo contenido si es necesario.

```
Error: P1001: Can't reach database server
```
→ PostgreSQL no está corriendo. Volver al B.5.

---

## B.8 Levantar el frontend

En una **nueva terminal** (dejar el backend corriendo):

```
cd frontend
npm run dev
```

**Debes ver ✅**
```
  VITE v6.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
  ➜  Network: use --host to expose
```

Abrir http://localhost:5173 en el navegador.

**Debes ver ✅** — la página de React cargando (por ahora solo el template base de Vite, hasta que se implemente la UI).

---

---

## Resolución de problemas comunes

### Puerto 5432 ocupado
```
Error: driver failed programming ... port is already allocated: 5432
```
Buscar qué proceso usa el puerto:
```
netstat -ano | findstr :5432
```
Si es PostgreSQL de otra instalación local: detenerlo antes de levantar Docker, o cambiar el puerto en `docker-compose.dev.yml` a `5433:5432`.

### Puerto 6379 ocupado
Mismo procedimiento que arriba con `:6379`. Si el proyecto de la empresa usa Redis, detenerlo primero o usar `6380:6379`.

### `npx prisma migrate dev` falla con P1001
PostgreSQL no está accesible. Verificar:
```
docker ps | grep postgres
```
Si no aparece, levantarlo:
```
docker compose up postgres -d
```

### El backend falla con "Config validation error"
El `ConfigModule` valida todas las variables al arrancar. El mensaje de error dice exactamente qué variable falta. Revisar el `.env` y añadir el valor correspondiente.

### `npm install` muy lento o falla
- Verificar conexión a internet
- Limpiar caché: `npm cache clean --force`
- Reintentar: `npm install`

---

## Estado de implementación por módulo

> Esta sección se actualiza con cada paso del desarrollo.

| Módulo | Estado | Notas |
|---|---|---|
| **Infraestructura** | ✅ Completo | docker-compose, .env, scripts |
| **Backend Core** | ✅ Completo | PrismaModule, ConfigModule, Guards, Filters, VaultService |
| **Auth** | ✅ Completo | POST /auth/register, login, refresh (rotation), logout |
| **Organizations** | ✅ Completo | CRUD + invite/role/remove members, protección último ADMIN |
| **Projects** | ✅ Completo | CRUD + soft-delete (archive), scoped por orgId del JWT |
| **Test Suites** | ✅ Completo | CRUD |
| **Tests + Steps** | ✅ Completo | CRUD + versioning inmutable JSONB |
| **Executions** | ✅ Completo | BullMQ + Docker workers + WebSocket |
| **Recorder** | ✅ Completo | WebSocket + Playwright container |
| **AI Engine** | ✅ Completo | DeepSeek + codegen + self-healing + NL-to-flow + chat |
| **Git Integration** | ✅ Completo | GitHub + GitLab (token cifrado) |
| **Secrets** | ✅ Completo | AES-256 via Vault — nunca expone valores |
| **Reports** | ✅ Completo | Agrega resultados + duración + stats |
| **Executor container** | ✅ Completo | Playwright runner con pg directo |
| **Frontend** | ✅ Completo | React 19 + Vite 8 + Tailwind v4, todas las features |

---

## Levantar el frontend (desarrollo)

```
cd frontend
npm install
npm run dev
```

**Debes ver ✅**
```
  VITE v8.x.x  ready in xxx ms

  ➜  Local:   http://localhost:5173/
```

### Variables de entorno del frontend

Crear `frontend/.env` copiando desde `frontend/.env.example`:

```
copy frontend\.env.example frontend\.env
```

Los valores por defecto funcionan para desarrollo local:
```env
VITE_API_URL=http://localhost:3000/api/v1
VITE_WS_URL=http://localhost:3000
```

### Buildear imágenes Docker (primera vez)

```
# Desde la raíz del proyecto
docker compose build                          # API + Worker
docker compose --profile build-images build  # Recorder + Executor
```

**Debes ver ✅** (sin errores, todas las imágenes con tag `latest`)

### Levantar todo en producción

```
docker compose up -d
```

El API correrá en `http://localhost:3000/api/v1` y el frontend en `http://localhost:5173`.

**NO debe aparecer ❌**
```
Cannot find module '@nestjs/bullmq'
```
→ El contenedor no tiene los módulos. Verificar que `docker compose build` completó sin errores.
