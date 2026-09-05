# PROJECT CONTEXT — Plataforma Web de Automatización E2E con IA

> **Estado:** Fase 5 — Instalación *(Fases 1-4 cerradas)*  
> **Versión del documento:** 2.2.0  
> **Última actualización:** 2026-09-05
>
> ⚠️ **Este documento es la ÚNICA fuente del estado de fases del proyecto** (§6).
> `PROJECT_STRUCTURE.md`, `NETWORK_PLAN.md` y `CLAUDE_CODE_CONTEXT.md` apuntan aquí y no
> declaran fase por su cuenta: cuando el estado vivía copiado en las cuatro cabeceras, las
> cuatro se quedaron diciendo «Fase 1 — Diseño» durante los tres meses en que se construyó
> la plataforma entera.

---

## 1. Visión General

Plataforma web fullstack de automatización de pruebas End-to-End (E2E) inspirada en Playwright, Testim y Mabl. Orientada a producción, modular y extensible. Combina capacidades de grabación visual, generación de código, ejecución aislada y agentes IA contextuales bajo una sola interfaz.

**Filosofía de diseño:** Low-code visual como capa primaria, con acceso completo al código subyacente para usuarios avanzados.

---

## 2. Perfiles de Usuario Target

### 2.1 QA Manual / No-Code
- Nulo o mínimo conocimiento de programación.
- Interacción exclusiva mediante flujos visuales, lenguaje natural asistido por IA y formularios.
- **No exponer:** código, clases, selectores CSS/XPath ni comandos de terminal.
- Abstracción total de la complejidad técnica.

### 2.2 QA Automation (Power User)
- Desarrolladores con capacidad de auditar y modificar el código generado.
- Acceso al código TypeScript (POM) generado.
- Sincronización con repositorios Git (GitHub / GitLab).
- Edición directa de scripts desde la plataforma.

---

## 3. Capacidades Core del Sistema

| Capacidad | Descripción |
|---|---|
| **Record & Play** | Grabación de acciones sobre aplicaciones web vía interfaz remota interactiva |
| **Codegen** | Generación automática de pruebas E2E: modelo semántico intermedio + TypeScript POM |
| **Ejecución Aislada** | Ejecución concurrente de pruebas desde la propia plataforma, sin terminal |
| **Gestión de Proyectos** | Administración completa de proyectos de testing sin CLI |
| **IA Contextual** | Agentes IA para resolución de dudas, documentación y creación de flujos en lenguaje natural |
| **Low-Code Visual** | Visualización y edición de flujos de prueba mediante diagramas de bloques |
| **Self-Healing Locators** | Reparación automática de selectores guiada por confianza de IA |
| **Versionamiento** | Versionamiento interno de pruebas + sincronización con Git |
| **Reportes Avanzados** | Reportes HTML con trazas, videos y capturas de pantalla |

---

## 4. Stack Tecnológico

### 4.1 Frontend
- **Framework:** React + Vite
- **Lenguaje:** TypeScript
- **UI:** Low-code visual (diagrama de bloques), formularios, interfaz de grabación remota

### 4.2 Backend
- **Framework:** NestJS
- **Lenguaje:** TypeScript
- **API:** REST + WebSockets

### 4.3 Base de Datos
- **Motor:** PostgreSQL
- **ORM:** Prisma
- **Estrategia de seguridad:** Row-Level Security (RLS) para multi-tenancy

### 4.4 Cola y Workers
- **Queue:** BullMQ
- **Broker:** Redis
- **Workers:** Procesos aislados para ejecución de pruebas

### 4.5 Motor de Ejecución
- **Runtime:** Docker (contenedores aislados por ejecución)
- **Core:** Playwright
- **Protocolo de comunicación:** Chrome DevTools Protocol (CDP)

### 4.6 Motor de Grabación
- **Protocolo:** Playwright CDP
- **Streaming visual:** WebSocket (buffer de frames en tiempo real)
- **Latencia objetivo:** < 2 segundos end-to-end

### 4.7 Motor de IA
- **LLM Provider:** DeepSeek API
- **Orquestación:** LangChain / Prompt Manager semicustom
- **Funciones:** Generación de código, self-healing, documentación, lenguaje natural → flujo de prueba

### 4.8 Servicios de Soporte
- **Git Service:** Módulo independiente (GitHub / GitLab integration)
- **Report Service:** Módulo independiente (HTML reports, trazas, video, screenshots)
- **Secrets:** Vault / Secrets Manager (wrapper de integración)

---

## 5. Arquitectura General

```
┌─────────────────────────────────────────────────────────────────┐
│                     Frontend App (React + Vite)                 │
│         [UI Visual] [Diagrama Bloques] [Grabación Remota]       │
└───────────────────────────┬─────────────────────────────────────┘
                            │ REST / WebSocket
┌───────────────────────────▼─────────────────────────────────────┐
│                       Backend API (NestJS)                      │
│   [Auth] [Projects] [Tests] [Executions] [AI Module] [Git]      │
└──────┬────────────────────┬────────────────────────┬────────────┘
       │                    │                        │
┌──────▼──────┐   ┌─────────▼──────────┐   ┌────────▼───────────┐
│  PostgreSQL │   │  BullMQ + Redis     │   │   AI Engine        │
│  (Prisma)   │   │  (Queue / Workers)  │   │  (DeepSeek API     │
│  RLS / MT   │   └────────┬────────────┘   │   + LangChain)     │
└─────────────┘            │                └────────────────────┘
                  ┌─────────▼──────────┐
                  │  Execution Engine  │
                  │  (Docker + PW Core)│
                  └─────────┬──────────┘
                            │ CDP over WebSocket
                  ┌─────────▼──────────┐
                  │  Recorder Engine   │
                  │  (CDP Stream)      │
                  │  Buffer < 2s       │
                  └────────────────────┘
```

---

## 6. Fases de Desarrollo

> **Cómo leer esta sección.** Cada fase cerrada lleva **la fecha y el commit que lo
> demuestran**. Una fase no se cierra marcando una casilla: se cierra con evidencia que
> cualquiera pueda desmentir en veinte segundos (`git log`). Ver §6.5.
>
> Las fases 2 y 3 se escriben el `2026-09-04`, **después de ocurrir**: el plan original solo
> definió la Fase 1 y la construcción siguió sin fases declaradas, guiada por
> `PENDIENTES.md`. Se reconstruyen aquí a partir del historial de git para que el documento
> deje de describir un proyecto que no existe.

### Fase 1 — Diseño y Arquitectura Base

**CERRADA** · `45d5597` · 2026-05-25 · checklist de cierre en `NETWORK_PLAN.md` §9

Entregables:

#### 6.1 Diseño de Base de Datos
- Schema Prisma completo (`schema.prisma`)
- Soporte Multi-tenancy (modelo `Organization`)
- Tablas de Auditoría de IA
- Versionamiento Semántico de Tests
- Estrategia conceptual de Row-Level Security (RLS) en PostgreSQL

#### 6.2 Estructura de Proyecto
- Arquitectura de carpetas detallada: Frontend (React) y Backend (NestJS) → `PROJECT_STRUCTURE.md`
- Ubicación explícita de los módulos del AI Engine, los workers de BullMQ y el wrapper de Vault

#### 6.3 Plano de Red y WebSockets CDP
- Diseño técnico del flujo de datos en tiempo real → `NETWORK_PLAN.md`
- Protocolo de comunicación Frontend ↔ Backend
- Mecanismo de transmisión de buffer visual vía CDP
- Captura de acciones del usuario con latencia objetivo < 2 s

> ⚠️ **La latencia < 2 s es un objetivo de diseño, nunca medido.** Sigue sin instrumentarse.

---

### Fase 2 — Flujo core de punta a punta

**CERRADA** · `d19d593` · 2026-05-28 · 10 commits desde `45d5597`

El recorrido completo del producto, funcionando: **grabar → convertir → ejecutar → ver**.

Entregables:
- **Grabación remota** vía contenedor con CDP, streaming de frames por WebSocket e
  interacción real (click y teclado) sobre el navegador remoto.
- **Persistencia de grabaciones** (modelo `Recording`) y **conversión a test ejecutable**
  (`POST /recorder/recordings/:id/convert`), con colapso de eventos `type` y deduplicación
  de navegaciones.
- **Ejecución aislada**: encolado BullMQ → worker → contenedor Docker efímero → Playwright.
- **Artefactos**: vídeo por test, capturas y su visor en la UI.
- **Control de ejecuciones**: ejecutar un test suelto, cancelar y borrar.

Lo que esta fase NO cubrió, y por eso hizo falta la Fase 3: los WebSockets no estaban
autenticados, el ciclo de vida de los contenedores no se cerraba y no había una sola prueba
automatizada.

---

### Fase 3 — Grado producción

**CERRADA** · `fa1d7fb` · 2026-08-17 · 16 commits desde `d19d593`

Endurecimiento del flujo de la Fase 2 hasta poder ponerlo delante de un cliente. Se guió
por dos auditorías, no por un plan previo.

Entregables:

| Bloque | Qué se cerró | Evidencia |
|---|---|---|
| **Auditoría 1** | Auth en WebSockets, aislamiento multi-tenant en gateways y en IA, ciclo de vida y cancelación real de contenedores, aserciones reales del executor | `b6995d8` → `83ebe59` · 2026-06-15 |
| **Roadmap completo** | Secretos al executor, CI/CD, selectores robustos, self-healing automático, proveedor Gemini multimodal, git sync real, limpieza de artefactos, config por proyecto | 2026-06-27 → 2026-06-28 |
| **Pruebas** | Tests unitarios de backend, worker, recorder y frontend; tanda de pruebas en vivo documentada en `Docs/test/` | 2026-06-27 → 2026-06-28 |
| **Auditoría 2** | 24 hallazgos: **17 cerrados el mismo día** (5 críticos, 5 altos, 7 medios) | `audit-2026-07-12.md` · 2026-07-12 |
| **Aislamiento en la base** | Políticas RLS de Postgres (`Backend/prisma/rls/`) | `fa1d7fb` · 2026-08-17 |

**Lo que quedó vivo al cerrar la fase** — no bloquea, pero está abierto y se dice:

1. **4 hallazgos BAJOS** del `audit-2026-07-12.md`: duración `0` en el paso fallido del
   executor, `if` vacío en `memberships.service.ts` (EDITOR/VIEWER no pueden abandonar la
   organización), `ActionEvent.type` incompleto en `recorder.gateway.ts`, y el PATCH de
   suites exigiendo el DTO de creación completo.
   *(Los otros 3 bajos — los tres de `auth.service.ts` — se cerraron el 2026-09-04.)*
2. **Deuda operativa de despliegue**: reconstruir las imágenes de executor y recorder,
   aplicar las migraciones pendientes en cada entorno.
3. **El lint no es gate de CI**: ~444 errores `prettier/prettier` pre-existentes por CRLF
   vs LF. Activarlo exige un reformat global del repositorio.

---

### Fase 4 — Producto usable

Esta fase no añade capacidades nuevas: **termina lo que este mismo documento prometió en
mayo y nunca se construyó**. Cada entregable cita la sección que lo exige.

**CERRADA** · 2026-09-04

No añadió capacidades nuevas: **terminó lo que este mismo documento prometió en mayo**.

| # | Entregable | Lo exige | Qué se construyó |
|---|---|---|---|
| **4.1** | **Perfil QA Manual / No-Code** | **§2.1** y §7 «Low-Code First» | `User.uiMode` con dos valores, `SENCILLO` y `COMPLEJO`. Todo el mundo empieza en sencillo; el cambio es siempre del propio usuario, desde ajustes. En sencillo los pasos se leen como frases y el detalle técnico va tras un desplegable: **escondido, nunca inaccesible**. `GET`/`PATCH /auth/me` + `describe-step.ts` (una sola copia, la usan las 4 pantallas) |
| **4.2** | **Documentación automática por IA** | **§3** «IA Contextual» | `documentation.service.ts` + `POST /ai/documentation`. Al modelo **no se le pasan los selectores**: no puede citar lo que no vio. `AiOperationType.DOCUMENTATION` deja de ser un enum sin uso |
| **4.3** | **Trazas y reporte HTML** | **§3** «Reportes Avanzados» | El executor genera la traza (`${testId}.zip`) que el colector ya buscaba desde el diseño. `GET /reports/:id/html`: autocontenido, con las capturas embebidas en base64 para que se vean cuando el token ya caducó |
| **4.4** | **Datos de demostración** | `PENDIENTES.md` (cruce con S.A.A.I) | `prisma/seed.ts`: idempotente, `--borrar`, se niega ante datos reales, crea su propia organización y cuenta una historia — una prueba que pasa, una que falla con su propuesta de reparación esperando aprobación, y un borrador |

**Criterio de cierre, y su corrección.** Se escribió como *«instalar, abrir, ver, ejecutar y
leer sin escribir un selector ni tocar una terminal»*. **Se corrige quitando «instalar»**: la
instalación es un problema propio y grande, y se declara como Fase 5 en vez de darla por
hecha dentro de esta. El criterio que sí se cumple es **abrir, ver, ejecutar y leer**.

**Cómo se verificó** (`2026-09-04`, con la plataforma en marcha contra Postgres, no leyendo
código): nueve comprobaciones contra la API, todas en verde. Las dos que importan: **0 de 5
descripciones de paso filtran un selector**, y la documentación por IA salió con **0
selectores** en 1.120 caracteres.

**Lo que quedó sin verificar, y se dice:** las trazas y las descripciones nuevas del grabador
**no se han visto funcionar** — viven en las imágenes de executor y recorder, que siguen
siendo las de junio. El código está; la prueba, no. Y la suite de tests automatizados no se
pasó en esta tanda.

**Además, cerrados los 4 hallazgos BAJOS que quedaban vivos de la Fase 3.** La Fase 3 ya no
tiene deuda de hallazgos.

---

### Fase 5 — Instalación *(ABIERTA)*

La Fase 4 dejó un producto que **se usa** sin programar. No dejó uno que **se instale** sin
programar, y eso es lo que separa «se lo enseño a alguien» de «alguien se lo lleva».

Cuando se abrió la fase, para arrancar Easy Test hacían falta: Node.js, Docker Desktop, Git,
el CLI de NestJS, **una clave de API de DeepSeek**, y **generar dos secretos a mano** con un
comando de `crypto`. Los dos últimos requisitos ya no existen (5.2 y 5.3, `2026-09-05`).

| # | Entregable | Estado |
|---|---|---|
| **5.1** | **Arranque de un solo play** | **HECHO (`2026-09-05`)** — `arrancar.bat` levanta la plataforma entera dentro de Docker, seis pasos en pantalla, y abre el navegador. **Ya no exige Node ni `npm install`**: solo Docker |
| **5.2** | **Secretos que se generan solos** si faltan, en vez de exigir dos comandos de `crypto` copiados a mano | **HECHO (`2026-09-05`, commit `e8d6ebe`)** — `Backend/scripts/preparar-entorno.mjs`, `npm run setup`, y `arrancar.bat` lo invoca solo si falta el `.env` |
| **5.3** | **La IA como opcional** — que la plataforma arranque sin `DEEPSEEK_API_KEY` y desactive las funciones de IA con un aviso, en vez de romper | **HECHO (`2026-09-05`, commit `2430d06`)** — arranca, avisa en el log, `GET /ai/estado` responde y las 5 operaciones dan `503` legible |
| **5.4** | **Instalador** para quien no tiene nada instalado | Abierto — hay un `install-easytest.exe` de mayo sin verificar |

**Cómo se verificaron 5.2 y 5.3** (`2026-09-05`, ejecutando, no leyendo código):

*5.2 — tres casos sobre una copia aislada del árbol, nunca sobre el `.env` real:*

| Caso | Resultado |
|---|---|
| No hay `.env` | Lo crea desde `.env.example` y genera los 2 secretos (`64` hex cada uno) |
| Segunda pasada seguida | `diff` del `.env`: **byte a byte idéntico** — no regenera nada |
| `.env` a medias (`JWT` puesto, `VAULT` en `CHANGE_ME`) | Rellena solo el que faltaba; **el que ya estaba no se toca** |

> El segundo y el tercero son los que importan: `VAULT_ENCRYPTION_KEY` cifra los secretos de
> cada organización y regenerarla no los invalida — **los deja ilegibles para siempre, sin
> ningún error**. Un script de conveniencia que puede destruir datos no es una conveniencia.

*5.3 — backend arrancado con `DEEPSEEK_API_KEY` vacía, contra Postgres real:*

| Comprobación | Resultado |
|---|---|
| ¿Arranca? | Sí — `Nest application successfully started` |
| ¿Avisa? | `WARN [DeepSeekProvider] Sin DEEPSEEK_API_KEY: las funciones de IA quedan desactivadas` |
| `GET /ai/estado` | `{"disponible":false,"motivo":"Falta DEEPSEEK_API_KEY…"}` |
| Las 5 operaciones (`chat`, `codegen`, `documentation`, `nl-to-flow`, `heal`) | **`503` las cinco**, con mensaje para una persona |

**Lo que NO cierra esto, y se dice:** `GET /ai/estado` **no tiene quien lo llame**. La
interfaz de IA del frontend está escrita y **sin montar en ninguna ruta** — ver
`PENDIENTES.md` §7. La mitad de servidor del aviso funciona; la de pantalla no existe.

**Cómo se verificó 5.1** (`2026-09-05`, ejecutando el `.bat`, no leyéndolo):

| Comprobación | Resultado |
|---|---|
| `arrancar.bat` de principio a fin | Los **6 pasos en verde** y el navegador abriéndose solo |
| ¿Hace falta Node en la máquina? | **No.** Si falta, el `.env` se prepara dentro de un contenedor |
| Login a través de nginx (`:8080`, no `:3000`) | `HTTP 200` |
| `GET /api/v1/projects` y `/ai/estado` por el mismo puerto | `HTTP 200` los dos |
| Recrear el backend y volver a pedir sin tocar nginx | `HTTP 200` — la resolución es dinámica |
| El comando de datos de ejemplo que promete el `.bat` | Funciona dentro del contenedor y **se niega** porque la base tiene datos reales |
| Tamaño de la imagen de la pantalla | **74,4 MB** (nginx sirviendo el compilado) |

**Tres defectos que solo aparecieron al ejecutar, y ninguno era visible leyendo:**

1. **Prisma no arrancaba en la imagen Alpine** — le falta OpenSSL, y en vez de decirlo falla
   con `Could not parse schema engine response`. Arreglado con `apk add openssl` y el
   `binaryTarget` de musl. *Este es el motivo real de que el arranque completo por Docker no
   hubiera funcionado nunca.*
2. **El backend no tenía el socket de Docker.** Arranca igual y **grabar deja de funcionar**,
   porque es el backend quien crea los contenedores de grabación. Fallo silencioso puro.
3. **nginx cacheaba la dirección del backend** al arrancar: al recrearlo, `502` hasta que
   alguien reiniciase nginx.

**Criterio de cierre de la Fase 5:** que alguien que no programa pueda pasar de un equipo sin
nada a la pantalla de acceso **sin abrir una terminal**.

> **Dónde estamos contra ese criterio:** ya no hace falta terminal ni Node — pero sigue
> haciendo falta **instalar Docker Desktop a mano**, y eso es el entregable `5.4`. La fase no
> se cierra hasta que eso también lo resuelva el instalador.

---

### 6.5 Cómo se cierra una fase

1. Una fase se cierra **con fecha y commit**, aquí. Nunca con una casilla marcada a mano:
   un número o un estado escrito a mano empieza a caducar el día que se escribe.
2. Lo que quede vivo al cerrar se **escribe en la propia fase**, no se calla ni se pasa en
   silencio a la siguiente.
3. **El estado de fases vive solo aquí.** Ningún otro documento lo declara — apuntan a esta
   sección. Cuatro cabeceras diciendo «Fase 1 — Diseño» durante tres meses de construcción
   es exactamente lo que produjo esta regla.

---

## 7. Restricciones y Principios de Diseño

| Principio | Detalle |
|---|---|
| **Desacoplamiento** | Arquitectura orientada a eventos y microservicios/servicios independientes |
| **Escalabilidad** | Ejecución concurrente aislada por contenedor Docker |
| **Seguridad** | RLS en PostgreSQL, Vault para secrets, multi-tenancy por organización |
| **Extensibilidad** | Módulos independientes por dominio (Git, Reports, AI, Execution) |
| **Mantenibilidad** | Código TypeScript tipado en frontend y backend |
| **Low-Code First** | La interfaz visual es la capa primaria; el código es capa secundaria opcional |

---

## 8. Glosario Técnico

| Término | Definición |
|---|---|
| **POM** | Page Object Model — patrón de diseño para organizar código de pruebas E2E |
| **CDP** | Chrome DevTools Protocol — protocolo para controlar navegadores Chromium a bajo nivel |
| **Self-Healing** | Capacidad de reparar automáticamente selectores rotos usando IA |
| **Semantic Model** | Representación intermedia de un flujo de prueba agnóstica al lenguaje de código |
| **BullMQ** | Sistema de colas sobre Redis para gestión de jobs y workers |
| **RLS** | Row-Level Security — control de acceso a nivel de fila en PostgreSQL |
| **Multi-tenancy** | Arquitectura que permite a múltiples organizaciones compartir la misma instancia aisladamente |
| **E2E** | End-to-End — pruebas que simulan flujos completos de usuario en un navegador real |

---

## 9. Referencias de Inspiración

- [Playwright](https://playwright.dev/) — Motor de automatización E2E
- [Testim](https://www.testim.io/) — Self-healing y AI-powered testing
- [Mabl](https://www.mabl.com/) — Low-code test automation con IA
- [BullMQ](https://docs.bullmq.io/) — Queue system sobre Redis
- [DeepSeek API](https://api-docs.deepseek.com/) — LLM Provider para AI Engine
- [LangChain](https://www.langchain.com/) — Orquestación de agentes IA
