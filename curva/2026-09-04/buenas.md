# Buenas — 2026-09-04 · Easy Test

> Primera entrada de curva de este proyecto. Llevaba **cuatro meses de trabajo (2026-05-25 →
> 2026-08-17) sin una sola anotación**, con `CLAUDE.md` exigiéndola desde el principio. Eso
> está anotado como tal en `malas.md`.

---

## 1. Se localizó el paso a paso, y resultó ser el antecesor de la biblia

`Docs/PROJECT_CONTEXT.md` tiene visión, perfiles de usuario, capacidades, fases, principios
y glosario. Le faltan alcance negativo y criterio de éxito/abandono —lo que la skill
`biblia` añadió después—, pero la espina estaba escrita desde el `2026-05-25`.

**Por qué cuenta como bueno:** el proyecto tenía un documento fundacional de verdad tres
meses antes de que existiera la skill. No hubo que inventar el marco, solo terminarlo.

## 2. Se contrastó lo declarado contra el código, y salió mejor de lo esperado

De las **9 capacidades** que declara el §3: **7 completas**, 2 parciales (documentación por
IA inexistente; reportes sin trazas ni HTML). De los **2 perfiles** de usuario del §2:
1 cumplido.

**Cómo se midió:** leyendo el disco, no la documentación — `ls` de módulos y operaciones,
`grep` de las capacidades una por una. Denominador declarado en cada cifra.

## 3. Tres hallazgos bajos cerrados, y el arreglo fue uno solo para dos de ellos

De los 7 BAJOS abiertos del `audit-2026-07-12.md`, cerrados los tres de `auth.service.ts`:

| Hallazgo | Qué era |
|---|---|
| `expiresIn: 900` quemado | El backend anunciaba siempre 15 min aunque `JWT_EXPIRES_IN` dijera otra cosa |
| `refreshExpiry()` solo entendía días | `'24h'` se parseaba como **24 días** |
| Carrera check-then-create en el registro | Email u organización duplicados devolvían **500** en vez de 409 |

**Lo que lo hace bueno:** los dos primeros eran el mismo defecto —dos lecturas distintas del
mismo formato— y se arreglaron con **una sola pieza compartida** (`common/util/duration.ts`),
no con dos parches. Sin copias que se desincronicen.

⚠️ **No verificado todavía:** no se ha compilado ni pasado la suite. Queda pendiente.

## 4. El arreglo del documento no fue actualizar los cuatro documentos

Los cuatro mentían porque **el estado vivía copiado en cuatro cabeceras**. Actualizarlas
habría dejado el mismo defecto para dentro de tres meses.

Se aplicó el corolario de la lección 0 — *que no haya «los demás»*: el estado de fases pasa
a vivir **solo** en `PROJECT_CONTEXT.md` §6, y los otros tres apuntan ahí. Y cada fase
cerrada lleva **fecha y commit** (`V5`), no una casilla marcada a mano.

---

## 5. La Fase 4 se cerró contra la plataforma en marcha, no contra el código

Nueve comprobaciones por HTTP con el backend arrancado y Postgres detrás. **No se leyó
código para dar nada por bueno.** Las dos que de verdad cierran la fase:

| Comprobación | Resultado |
|---|---|
| Descripciones de paso que filtran un selector | **0 de 5** |
| Selectores en la documentación que escribe la IA | **0** en 1.120 caracteres |

**Por qué cuenta:** `I8` dice que *un instrumento escrito mirando su propia entrada siempre
pasa su propio examen*. El material de esta comprobación lo produjo el seed y lo leyó la API
por separado — no es el mismo código juzgándose.

## 6. Cuatro defectos que solo aparecieron al ejecutar

Ninguno era visible leyendo:

1. **Un PostgreSQL 17 nativo de Windows secuestraba el puerto 5432**, así que
   `localhost:5432` respondía desde otra base. El error decía «Authentication failed» con las
   credenciales correctas.
2. **Dos migraciones sin aplicar desde julio** — estaban anotadas y seguían sin hacerse.
3. **El informe decía «Lanzada por fcf97a7a-96a3-…»**: un informe para personas enseñando un
   identificador de base de datos.
4. **Una regresión propia**: poner `prisma/seed.ts` fuera de `src/` movió la salida del build
   a `dist/src/main.js` y `start:prod` moría con un `MODULE_NOT_FOUND` que no menciona la causa.

Los cuatro, arreglados. El primero además dejó `arrancar.bat`, que lo detecta solo.

## 7. La reparación del puerto no fue arreglar el puerto

`5432:5432` estaba clavado en el compose. Se podía haber cambiado a 5433 y seguir. Se hizo
configurable (`${POSTGRES_PORT:-5432}`) **con el porqué escrito dentro del archivo**, porque
el siguiente que lo sufra no va a estar en esta sesión.
