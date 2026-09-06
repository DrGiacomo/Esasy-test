# Perfeccionar — `2026-09-05` · Easy Test

> **Norte del proyecto** (deducido de `PROJECT_CONTEXT.md` §6): *que alguien que no programa
> pueda instalar, usar y **confiar** en la plataforma sin abrir una terminal.* Cada propuesta se
> juzga por si acerca a eso, no por si es una mejora bonita.
>
> **Nada de lo de aquí está ya en `PENDIENTES.md`.** Lo que sí está —el instalador `5.4`, la
> interfaz de IA sin montar `§7`— no se repite; a lo sumo se prioriza y se dice.
>
> **Ninguna propuesta añade dependencias** ni toca el stack.

---

## 1 · Motor de ejecución

### P1 · Cuando el ejecutor revienta, no queda ni una línea de por qué

**Hoy.** `docker.service.ts:58-66` para el contenedor y lo elimina. **Nadie llama a
`container.logs()`** en todo el backend. Todo lo que el executor escribió por consola se borra
con él.

**Propuesta.** Antes de `remove()`, leer las últimas ~200 líneas del contenedor y guardarlas en
`executions.errorMessage` (o en un artefacto `executor.log` junto al vídeo) **solo cuando el
código de salida no es 0**.

**Antes → Después.** Hoy: una ejecución falla y el usuario ve *«Execution failed»* sin más;
para saber por qué hay que reproducirlo a mano y llegar a tiempo de leer los logs antes de que
el contenedor desaparezca. Después: el motivo real —Chromium no arrancó, la red no resolvía, se
quedó sin memoria— queda guardado con la ejecución.

**Por qué escala hacia el norte:** «confiar» es la tercera pata del criterio, y hoy un fallo del
motor es indistinguible de un fallo de la prueba del usuario. Esa confusión es exactamente lo
que hace abandonar una herramienta de pruebas.

`Impacto: alto` · `Esfuerzo: bajo` (~15 líneas en un archivo) · `Riesgo: bajo`

---

### P2 · La evidencia se busca una vez y, si no está, se pierde para siempre

**Hoy.** `artifact-collector.service.ts:20-31` hace tres `fs.existsSync` justo después de que
el contenedor termina. Si el archivo aún no está, la columna queda `null` y **no se vuelve a
mirar nunca**.

**Propuesta.** Reintentar la comprobación con una espera corta (por ejemplo 3 intentos con 500
ms), y **registrar en el log cuando un artefacto esperado no aparece**, en vez de dejar un
`null` mudo.

**Antes → Después.** Hoy: una ejecución correcta puede quedarse sin vídeo ni traza y nadie sabe
si es que no se generó o que no se encontró. Después: o está, o consta por qué no está.

`Impacto: alto` · `Esfuerzo: bajo` (~10 líneas) · `Riesgo: bajo`

> Es el hallazgo MEDIO de `audit-2026-09-05.md`. Aquí va la propuesta concreta.

---

### P3 · El 97,5 % del tiempo de una ejecución no es ejecutar

**Hoy, medido** en la ejecución `0b0b8946` del `2026-09-05`:

| | ms |
|---|---|
| Ejecución completa (`startedAt` → `completedAt`) | **19.506** |
| El test dentro del contenedor | 18.442 |
| **Los tres pasos, sumados** | **489** |

Es decir: **19 segundos de espera para medio segundo de trabajo real.** El resto es descargar y
arrancar el contenedor, levantar Chromium, abrir el contexto y conectar a la base.

> ## ✅ MEDIDO Y RESUELTO EL MISMO DÍA — de `19.064 ms` a `1.100 ms`
>
> Se instrumentó el ejecutor con seis marcas de tiempo, y el resultado **desmintió la
> hipótesis de partida**: el arranque no era el problema.
>
> | Marca | ms |
> |---|---|
> | Chromium + base + Redis (en paralelo) | 343 |
> | Contexto y página | 53 |
> | **Los tres pasos** | **500** |
> | Guardar la traza | 38 |
> | Cerrar el contexto | 29 |
> | **Guardar el vídeo — ANTES** | **15.000** |
> | **Guardar el vídeo — DESPUÉS** | **2** |
>
> **La causa:** `executor.js` pedía `video.saveAs()` **antes** de cerrar el contexto. Playwright
> no termina de escribir el vídeo hasta el cierre, así que esa promesa no podía resolverse y el
> `Promise.race` esperaba su temporizador **entero: 15 segundos, en cada ejecución que grabara
> vídeo**.
>
> **El arreglo son tres líneas movidas de sitio:** parar la traza → cerrar el contexto →
> guardar el vídeo. Verificado ejecutando: `COMPLETED` en **1.100 ms** con vídeo (firma WebM
> correcta), traza (70 KB) y captura final **los tres presentes**.
>
> **Por qué nadie lo vio en cuatro meses:** no fallaba nada. La ejecución salía bien, el vídeo
> aparecía y el test se marcaba `COMPLETED`. Solo tardaba quince segundos de más, siempre. Es
> la clase de defecto que ningún test caza porque **no hay nada que esté mal, solo lento** — y
> el único que lo delata es medir el reparto del tiempo.

**Propuesta original, en dos tiempos y en este orden:**

1. **Medir dónde se va** — instrumentar el executor con cuatro marcas de tiempo (proceso vivo,
   Chromium arrancado, contexto listo, primer paso). Sin esto, optimizar es adivinar, y `L4` del
   equipo dice que un tiempo que no se calcula no se da.
2. **Solo entonces** decidir entre: reutilizar un contenedor caliente por proyecto, arrancar
   Chromium mientras se leen los pasos, o dejarlo como está si resulta que el grueso es la carga
   de la imagen (que se arregla con `P6`).

**Antes → Después.** Hoy, ejecutar un test suelto para comprobar un cambio cuesta 20 segundos, y
eso decide si alguien usa la plataforma o vuelve a probar a mano. El objetivo razonable es bajar
de 5 s en el caso de un test.

**Ojo con el reparto:** el coste es **por ejecución**, no por test. Una tanda de 20 tests ya lo
amortiza; el que sufre es el caso más frecuente mientras se construye una prueba — que es
justamente el del perfil que no programa.

`Impacto: alto` · `Esfuerzo: bajo` (tres líneas movidas) · `Riesgo: bajo` — **HECHO el `2026-09-05`**

**Lo que queda abierto de aquí:** cada ejecución con vídeo deja **dos** archivos `.webm` — el
que escribe Playwright con nombre de hash y la copia que hace `saveAs`. Ocupan lo mismo y solo
se usa uno. Se limpia con `video.delete()` después de copiarlo.

---

### P4 · El backend no se cierra, lo matan

**Hoy.** `bootstrap-worker.ts:7` llama a `app.enableShutdownHooks()`. **`main.ts` no.** Al parar,
el backend sale con código **137** — SIGKILL: Docker esperó, no obtuvo respuesta y lo mató.

**Propuesta.** Añadir `app.enableShutdownHooks()` en `main.ts`, igual que ya hace el worker.

**Antes → Después.** Hoy, parar la plataforma corta en seco lo que estuviera atendiendo: una
subida a medias, una escritura sin terminar. Después, el proceso cierra sus conexiones y sale
por su propio pie.

`Impacto: medio` · `Esfuerzo: bajo` (una línea) · `Riesgo: bajo`

> Observado hoy al probar `parar.bat`: `Exited (137)` para el backend y `Exited (0)` para los
> demás. La diferencia era esa línea.

---

### P5 · Cancelar tarda hasta 3 segundos y cuesta una consulta cada 3 segundos por ejecución

**Hoy.** `execution.processor.ts:180-190` detecta la cancelación **sondeando la base cada 3 s**
(`CANCEL_POLL_MS`). Con diez ejecuciones a la vez son diez consultas cada tres segundos, y el
usuario espera hasta 3 s a que su cancelación surta efecto.

**Propuesta.** Publicar la cancelación en el canal de Redis que **ya existe** para los eventos
(`execution:<id>:events`) y que el worker la escuche, dejando el sondeo como red de seguridad a
un intervalo mucho más largo.

**Antes → Después.** Cancelación instantánea y menos carga constante sobre la base. Sin
dependencias nuevas: Redis ya está y ya se usa para esto.

`Impacto: medio` · `Esfuerzo: medio` · `Riesgo: medio` — toca el camino de cancelación, que es
delicado y ya tiene tests. **No lo haría sin que P1 y P2 estén dentro.**

---

## 2 · Instalación y peso *(la vía directa al norte)*

### P6 · Las imágenes traen tres navegadores y solo se usa uno

**Hoy.** `executor/Dockerfile:1` y `recorder/Dockerfile:1` parten de
`mcr.microsoft.com/playwright:v1.48.0-jammy`, que incluye **Chromium, Firefox y WebKit**.
`executor.js:3` y `recorder.js:3` solo importan `chromium`.

| | Hoy |
|---|---|
| Imagen del executor | **2,91 GB** |
| Imagen del recorder | **2,91 GB** |
| Primera descarga para un usuario nuevo | **~5,8 GB** |

**Propuesta.** Partir de `node:20-jammy` e instalar únicamente Chromium
(`npx playwright install --with-deps chromium`). Estimación: **~1,3 GB por imagen**, sin cambiar
una línea de la lógica.

**Antes → Después.** La primera vez que alguien instala Easy Test baja **la mitad**. En una
conexión doméstica eso es la diferencia entre veinte minutos y cuarenta, y es el momento en que
la gente abandona una instalación.

**Por qué escala hacia el norte:** el entregable `5.4` es el instalador. Un instalador que baja
5,8 GB no lo salva ninguna interfaz bonita.

⚠️ **Lo que hay que comprobar antes de darlo por bueno** (`M13`): que la imagen resultante
funcione de verdad, no solo que pese menos. El paquete `playwright` fija versión de navegador, y
la imagen oficial trae además fuentes y códecs que un `--with-deps` puede no instalar: sin ellos
**el vídeo o el renderizado de ciertas páginas pueden cambiar**. Se mide con una ejecución real y
comparando el vídeo, no compilando.

`Impacto: alto` · `Esfuerzo: medio` · `Riesgo: medio` (hay que verificar ejecutando)

---

## 3 · Datos y contratos

### P7 · La ejecución no guarda qué se pidió ejecutar

**Hoy.** `executions.service.ts:24-29` crea la fila con `projectId`, `triggeredBy` y `status`.
El `suiteId` y el `testId` **viajan en el job de la cola y se pierden** al terminar. La tabla
`executions` no tiene esas columnas — pero `Frontend/src/types/models.ts:131` **declara
`suiteId` como si existiera**.

**Propuesta.** Dos columnas nulables (`suiteId`, `testId`) en `executions`, rellenadas al crear,
y quitar del tipo del frontend lo que no llega.

**Antes → Después.** Hoy no se puede responder *«¿cuántas veces se ha ejecutado esta suite?»* ni
*«enséñame el historial de este test»* sin reconstruirlo desde los resultados. Después, es una
consulta directa — y es la base de cualquier pantalla de tendencias.

`Impacto: medio` · `Esfuerzo: bajo` (una migración y dos campos) · `Riesgo: bajo`

---

## Las 3 que haría primero

| | Por qué |
|---|---|
| **P1 · Guardar los logs del ejecutor** | Es la diferencia entre «falló» y «falló por esto». Quince líneas, y arregla el peor agujero de diagnóstico que tiene el producto |
| **P2 · Reintentar al recoger la evidencia** | Una plataforma de pruebas que pierde la prueba de lo que hizo se queda sin su producto. Diez líneas |
| **P4 · Cierre ordenado del backend** | Una línea, riesgo cero, y quita un `137` que hoy corta en seco lo que estuviera haciendo |

Las tres juntas son **menos de 30 líneas** y ninguna toca el camino crítico de ejecución.

**P3 (medir el arranque) es la de más impacto a medio plazo**, pero empieza por medir, no por
optimizar: hoy no sabemos si esos 19 segundos son la imagen, Chromium o la red.

## Lo que NO propongo, y por qué

- **Índices nuevos:** los revisé (`executions`, `execution_results`, `step_results`) y están bien
  puestos. No hay N+1 en las consultas calientes.
- **Reducir el paquete del frontend:** son **604 KB** con división por página. No hay nada que
  ganar ahí.
- **Nada de la interfaz de IA:** ya está en `PENDIENTES §7`. Repetirlo sería ruido.
