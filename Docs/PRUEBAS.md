# Guía de Inicio y Pruebas — Plataforma E2E Automation

## Requisitos previos

- Docker Desktop corriendo
- Node.js 20+
- Git

---

## 1. Infraestructura (PostgreSQL + Redis)

```bash
cd "C:\Easy test"
docker compose up postgres redis -d
```

Espera hasta que ambos contenedores muestren `(healthy)`:
```bash
docker ps
```

---

## 2. Backend

### Primera vez (y tras cambios de schema)

```bash
cd "C:\Easy test\backend"
npx prisma migrate dev --name init
```

### Levantar el servidor

```bash
cd "C:\Easy test\backend"
node dist/main.js
# O en modo watch:
npm run start:dev
```

El servidor arranca en `http://localhost:3000`. Verás en consola:
```
Nest application successfully started
Backend running on http://localhost:3000/api/v1
```

---

## 3. Frontend

```bash
cd "C:\Easy test\frontend"
npm run dev
```

Disponible en `http://localhost:5173`

---

## 4. Pruebas de API (curl)

### Registro de usuario

```bash
curl -X POST http://localhost:3000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "displayName": "Test User",
    "email": "test@example.com",
    "password": "Password123!",
    "organizationName": "Mi Organización"
  }'
```

Respuesta esperada:
```json
{
  "accessToken": "eyJ...",
  "refreshToken": "...",
  "expiresIn": 900
}
```

### Login

```bash
curl -X POST http://localhost:3000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "test@example.com", "password": "Password123!"}'
```

Guarda el `accessToken` para las siguientes llamadas.

### Crear proyecto (reemplaza TOKEN)

```bash
curl -X POST http://localhost:3000/api/v1/projects \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{
    "name": "Mi Proyecto",
    "description": "Proyecto de prueba",
    "baseUrl": "https://example.com"
  }'
```

### Crear suite de tests

```bash
curl -X POST http://localhost:3000/api/v1/projects/PROJECT_ID/suites \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"name": "Suite Login", "description": "Tests de autenticación"}'
```

### Crear test dentro de la suite

```bash
curl -X POST http://localhost:3000/api/v1/suites/SUITE_ID/tests \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"name": "Login exitoso", "description": "Verifica el flujo de login"}'
```

### Crear secreto

```bash
curl -X POST http://localhost:3000/api/v1/secrets \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN" \
  -d '{"name": "API_KEY", "type": "ENV_VAR", "value": "mi_valor_secreto"}'
```

---

## 5. Prueba desde el navegador

1. Abre `http://localhost:5173`
2. Haz clic en **Registrar** → completa el formulario
3. Login → serás redirigido al dashboard
4. Crea un proyecto desde **Proyectos** → **Nuevo**
5. Entra al proyecto → crea una **Suite** → crea un **Test**
6. Edita el test con el **Flow Editor** (drag & drop de pasos)
7. En **Ajustes** puedes agregar **Secretos** e integraciones Git

---

## 6. Variables de entorno (backend/.env)

```env
NODE_ENV=development
PORT=3000

DATABASE_URL=postgresql://e2e_user:e2e_pass@localhost:5432/e2e_platform
REDIS_URL=redis://localhost:6379

JWT_SECRET=<64 chars hex>
JWT_EXPIRES_IN=15m
REFRESH_TOKEN_EXPIRES_IN=7d

VAULT_ENCRYPTION_KEY=<64 chars hex>   # 32 bytes para AES-256

DEEPSEEK_API_KEY=<tu_api_key>         # Requerido solo para funciones de IA
DEEPSEEK_BASE_URL=https://api.deepseek.com
```

> El `DEEPSEEK_API_KEY` es necesario para el asistente de IA, generación de tests desde lenguaje natural y self-healing. Sin él, las demás funciones (auth, proyectos, tests, ejecuciones) funcionan normalmente.

---

## 7. Endpoints disponibles

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/v1/auth/register` | Registro + crea organización |
| POST | `/api/v1/auth/login` | Login |
| POST | `/api/v1/auth/refresh` | Renovar access token |
| POST | `/api/v1/auth/logout` | Invalidar refresh token |
| POST | `/api/v1/projects` | Crear proyecto |
| GET | `/api/v1/projects` | Listar proyectos |
| GET | `/api/v1/projects/:id` | Detalle proyecto |
| POST | `/api/v1/projects/:id/suites` | Crear suite |
| GET | `/api/v1/projects/:id/suites` | Listar suites |
| POST | `/api/v1/suites/:id/tests` | Crear test |
| GET | `/api/v1/suites/:id/tests` | Listar tests |
| GET | `/api/v1/tests/:id` | Detalle test |
| POST | `/api/v1/tests/:id/steps` | Agregar step |
| PUT | `/api/v1/tests/:id/steps/reorder` | Reordenar steps |
| POST | `/api/v1/executions` | Lanzar ejecución |
| GET | `/api/v1/executions/project/:id` | Ejecuciones de un proyecto |
| GET | `/api/v1/executions/:id` | Estado de ejecución |
| GET | `/api/v1/reports/:executionId` | Reporte de ejecución |
| POST | `/api/v1/recorder/sessions` | Iniciar sesión de grabación |
| DELETE | `/api/v1/recorder/sessions/:id` | Terminar sesión |
| POST | `/api/v1/secrets` | Crear secreto |
| GET | `/api/v1/secrets` | Listar secretos |
| POST | `/api/v1/git/integrations` | Agregar integración Git |
| POST | `/api/v1/ai/chat` | Chat con asistente IA |
| POST | `/api/v1/ai/nl-to-flow` | Lenguaje natural → test steps |

---

## 8. WebSockets

- `ws://localhost:3000/executions` — Tiempo real de ejecuciones
  - Emitir: `execution:subscribe` con `{ executionId }`
  - Recibir: `execution:update` con el estado

- `ws://localhost:3000/recorder` — Grabación de sesiones
  - Emitir: `session:join` con `{ sessionId }`
  - Recibir: `frame` (imagen JPEG base64) y `action:captured`

---

## 9. Comandos rápidos de referencia

```bash
# Ver logs del backend en tiempo real
tail -f /tmp/backend.log

# Reiniciar solo los contenedores de infra
docker compose restart postgres redis

# Ver estado de la DB con Prisma Studio
cd "C:\Easy test\backend" && npx prisma studio

# Build completo del backend
cd "C:\Easy test\backend" && npm run build

# Build completo del frontend
cd "C:\Easy test\frontend" && npm run build

# Construir imágenes Docker del recorder y executor
cd "C:\Easy test" && docker compose --profile build-images build
```

---

## 10. Notas importantes

- **Self-Healing**: La IA *propone* fixes. El usuario debe aprobar/rechazar desde la UI. Los test steps nunca se modifican sin aprobación explícita.
- **Secretos**: Los valores se cifran con AES-256-GCM (Vault). Nunca aparecen en respuestas de API ni logs.
- **Tokens**: El access token vive en memoria (Zustand). El refresh token en localStorage. La DB almacena solo el hash SHA-256 del refresh token.
- **Multitenancy**: Todos los recursos están aislados por `organizationId`. El RLS se aplica a nivel de aplicación.
