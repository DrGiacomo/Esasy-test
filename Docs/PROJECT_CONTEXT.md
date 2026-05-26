# PROJECT CONTEXT — Plataforma Web de Automatización E2E con IA

> **Estado:** Fase 1 — Diseño y Arquitectura  
> **Versión del documento:** 1.0.0  
> **Última actualización:** 2026-05-25

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

### Fase 1 — Diseño y Arquitectura Base *(actual)*

Entregables requeridos:

#### 6.1 Diseño de Base de Datos
- Schema Prisma completo (`schema.prisma`)
- Soporte Multi-tenancy (modelo `Organization`)
- Tablas de Auditoría de IA
- Versionamiento Semántico de Tests
- Estrategia conceptual de Row-Level Security (RLS) en PostgreSQL

#### 6.2 Estructura de Proyecto
- Arquitectura de carpetas detallada: Frontend (React) y Backend (NestJS)
- Ubicación explícita de:
  - Módulos del AI Engine
  - Workers de BullMQ
  - Wrapper de integración con Vault / Secrets Manager

#### 6.3 Plano de Red y WebSockets CDP
- Diseño técnico del flujo de datos en tiempo real
- Protocolo de comunicación Frontend ↔ Backend
- Mecanismo de transmisión de buffer visual vía CDP
- Captura de acciones del usuario con latencia < 2s

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
