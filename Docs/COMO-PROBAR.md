# Cómo probar que Easy Test funciona

> **Para quién es esto.** Para cualquiera que tenga el proyecto delante y quiera comprobar,
> en media hora y sin leer código, que hace lo que dice. No hace falta saber programar para
> seguirlo; sí hace falta tener Docker y Node instalados.
>
> **Última verificación completa:** `2026-09-04`. Todos los resultados de este documento se
> observaron ese día contra la plataforma en marcha. Si algo no te sale igual, **eso es un
> hallazgo**: anótalo en `curva/<hoy>/malas.md`.

---

## Antes de empezar

| Necesitas | Cómo comprobarlo |
|---|---|
| Docker Desktop **arrancado** | Que diga «Engine running» |
| Node.js 20 o superior | `node --version` |
| `Backend/.env` relleno | Copia de `.env.example` |

> ⚠️ **Si ya tienes PostgreSQL instalado en tu máquina**, el servicio nativo se queda con el
> puerto 5432 y `localhost:5432` responderá desde **esa** base, no desde el contenedor. El
> error que verás es `Authentication failed` con las credenciales correctas. `arrancar.bat`
> lo detecta y se pasa al 5433 solo; si arrancas a mano, cambia `POSTGRES_PORT` y el puerto
> de `DATABASE_URL`.

---

## Paso 0 — Arrancar

```
arrancar.bat
```

| ✅ Debe pasar | ❌ No debe pasar |
|---|---|
| Seis comprobaciones en verde, tres ventanas nuevas (backend, worker, frontend) y la web en `http://localhost:5173` | Que se quede a medias. Si falta Docker, Node o el `.env`, **aborta antes de tocar nada** y dice cuál falta |

Para parar todo: `parar.bat`. Los contenedores se paran, **no se borran**: tu base sigue ahí.

---

## Paso 1 — Meter los datos de ejemplo

```
cd Backend
npm run db:seed
```

| ✅ Debe pasar | ❌ No debe pasar |
|---|---|
| Un guion en pantalla con dos cuentas y qué mirar | Que toque nada tuyo. Crea **su propia** organización |
| Si tu base ya tiene datos reales, **se niega a sembrar** y te dice cómo forzarlo | Que siembre encima sin avisar |

**Compruébalo dos veces más**, que es donde fallan los seeds:

```
npm run db:seed          <- correrlo otra vez
npm run db:seed -- --borrar
```

- La segunda siembra debe dejar **exactamente lo mismo**: 1 organización, 2 usuarios,
  3 pruebas, 10 pasos. No el doble.
- `--borrar` debe retirar **solo lo suyo**. Las organizaciones que ya tenías siguen ahí.

Las dos cuentas, con la misma contraseña `demo1234`:

| Cuenta | Quién es | Ve la plataforma en |
|---|---|---|
| `ana@demo.local` | QA manual, no programa | **Sencillo** |
| `dani@demo.local` | QA automation, audita el código | **Complejo** |

---

## Paso 2 — Entrar como Ana

| ✅ Debe pasar | ❌ No debe pasar |
|---|---|
| Arriba aparece **«Ana Ruiz»** | Que el nombre salga en blanco |
| En Configuración hay una pestaña **Vista** | Que aparezca la pestaña **Git** — es de modo complejo |

---

## Paso 3 — La prueba que de verdad importa

Abre la prueba **«Entrar con usuario y contraseña correctos»** y lee sus pasos.

**Deben leerse como frases:**

```
1. Ir a la página de acceso
2. Escribir "ana@demo.local" en «Correo electrónico»
3. Escribir la contraseña en «Contraseña»
4. Pulsar «Entrar»
5. Comprobar que aparece el saludo «Hola, Ana»
```

| ✅ Debe pasar | ❌ No debe pasar |
|---|---|
| Cinco frases en castellano | **Ni un `#id`, ni un `[name=…]`, ni un `text="…"`** a la vista |

> **Esta es la comprobación que cierra la Fase 4.** El 2026-09-04 dio **0 de 5 descripciones
> filtrando selector**. Si ves uno solo, el modo sencillo está roto.

Ahora despliega **«ver detalle técnico»** en cualquier paso:

| ✅ Debe pasar | ❌ No debe pasar |
|---|---|
| Aparece el selector, su tipo y su valor | Que para ver un selector haya que cambiar la cuenta entera de modo |

---

## Paso 4 — La prueba que falló, y la reparación que espera

Abre **«Avisar cuando la contraseña es incorrecta»**.

| ✅ Debe pasar | ❌ No debe pasar |
|---|---|
| Falló en el último paso | — |
| Hay una propuesta de reparación: cambiar la clase `.alert-danger-v1` por `[role="alert"]`, con confianza **0,21 → 0,88** | **Que la propuesta se haya aplicado sola.** Debe estar en `PENDING_APPROVAL` hasta que una persona decida |

Esa es la decisión central del producto: **la IA propone, un humano aprueba.** Si alguna vez
ves un selector cambiado sin que nadie lo aprobara, eso es el fallo más grave posible aquí.

---

## Paso 5 — Documentar la prueba con IA

Con la prueba abierta, pide su documentación (`POST /ai/documentation`).

| ✅ Debe pasar | ❌ No debe pasar |
|---|---|
| Tres secciones: qué comprueba, cómo lo hace, qué significaría que fallase | **Ni un selector en el texto.** Al modelo no se le pasan, así que no puede citarlos |
| Se ve en los dos modos | — |

Verificado el 2026-09-04: 1.120 caracteres, **0 selectores**, 2,9 segundos.

> Necesita `DEEPSEEK_API_KEY` en el `.env`. Es la única parte de este recorrido que cuesta
> dinero — céntimos, y la cuenta es de prepago.

---

## Paso 6 — Ejecutar de verdad

Lanza la prueba y espera. Tarda alrededor de un minuto.

| ✅ Debe pasar | ❌ No debe pasar |
|---|---|
| Pasa por `PROVISIONING` → `RUNNING` → `COMPLETED` | Que se quede atascada en `RUNNING` |
| Al terminar hay **vídeo `.webm`, captura `_final.png` y traza `.zip`** en el volumen de artefactos | Que `traceUrl` sea `null` — significa que la imagen del executor es vieja |
| El paso que falló tiene **su duración real**, no `0` | `durationMs: 0` en un paso `FAILED`. Los `SKIPPED` sí van a 0 |

Medido el 2026-09-04: 52 segundos, traza de 41,7 KB, paso fallido en **30.099 ms**.

> ⚠️ **Si la traza no aparece**, reconstruye las imágenes:
> `docker compose --profile build-images build executor recorder`

---

## Paso 7 — El informe, y el informe en HTML

```
GET /api/v1/reports/<id>          <- JSON
GET /api/v1/reports/<id>/html     <- para guardar o reenviar
```

| ✅ Debe pasar | ❌ No debe pasar |
|---|---|
| «Lanzada por **Dani Soto**» | Que diga «lanzada por `fcf97a7a-96a3-…`» |
| Las capturas **se ven dentro del archivo**: guárdalo, ábrelo sin conexión, siguen ahí | Que se vean rotas al caducar la sesión |
| El error de Playwright está **detrás de un desplegable**, con una frase en cristiano delante | Que el `TimeoutError` con su clase CSS sea lo primero que se lee |

---

## Paso 8 — Las dos caras

Ve a **Configuración → Vista** y pásate a **Complejo**.

| ✅ Debe pasar | ❌ No debe pasar |
|---|---|
| El cambio se ve al instante | Que haya que volver a entrar |
| Los pasos vuelven a ser selectores; reaparecen el código TypeScript, Git y la traza | Que se pierda algún dato. El modo solo cambia **lo que se enseña** |

Y lo último: **registra una cuenta nueva desde cero.**

| ✅ Debe pasar | ❌ No debe pasar |
|---|---|
| Cae en **Sencillo**, sin excepciones — ni por crear la organización, ni por el rol | Que dos personas registradas igual acaben viendo cosas distintas |

---

## Si prefieres comprobarlo por consola

Nueve comprobaciones automáticas, sin abrir el navegador:

| Qué | Resultado del 2026-09-04 |
|---|---|
| `GET /auth/me` con Ana | `uiMode: SENCILLO` y su nombre real |
| Descripciones que filtran selector | **0 de 5** |
| `PATCH /auth/me/preferences` con un valor inventado | `400` |
| `POST /ai/documentation` | 1.120 caracteres, 0 selectores |
| `GET /reports/:id/html` | `200`, 7.965 bytes, 2 capturas embebidas |
| Seed dos veces seguidas | 1 org · 2 usuarios · 3 pruebas · 10 pasos |
| `--borrar` | 0 de demostración, 11 tuyas intactas |
| Un EDITOR quita a otro / se va él | `403` / `204` |
| `PATCH` de suite solo con descripción | `200`, nombre conservado |

Y la suite automatizada:

```
cd Backend  && npx jest      ->  83 tests, 13 suites
cd Frontend && npx vitest run ->   3 tests
```

---

## Lo que este recorrido **no** prueba

Se dice, porque un recorrido sin punto ciego declarado promete de más:

- **La captura real de pasos grabando.** El recorder arranca, persiste y convierte, pero
  este recorrido no conduce el navegador con interacciones reales. Las frases que ves en las
  pruebas de ejemplo las escribió el seed, no una grabación.
- **La instalación desde cero.** Es la Fase 5. Hoy sigue pidiendo Node, Docker, Git y dos
  secretos generados a mano.
- **El comportamiento con varios usuarios a la vez.** Todo lo de aquí es de un solo usuario.
