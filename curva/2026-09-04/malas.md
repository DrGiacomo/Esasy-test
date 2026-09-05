# Malas — 2026-09-04 · Easy Test

---

## 1. Se tocó código sin haber acordado el modo de trabajo

**Qué pasó.** El usuario pidió aplicar correcciones y estándares «pero primero terminemos lo
que haga falta terminar». Se empezó a editar de inmediato: se creó
`Backend/src/common/util/duration.ts` y se reescribieron tres bloques de
`Backend/src/modules/auth/auth.service.ts`. El usuario interrumpió con *«espera aún está
analizando verdad? no cambies nada antes de preguntarme»*. Preguntado después, eligió
**analizar sin tocar y luego plan que él aprueba** — justo lo contrario de lo que ya estaba
ocurriendo.

**Causa.** «Terminar lo pendiente» se leyó como una autorización a ejecutar, cuando era el
**orden** de un trabajo cuyo modo aún no se había acordado. Los tres arreglos eran correctos
y estaban en el audit, así que la falta no es lo que se hizo: es **cuándo**.

**Lección.** *Un encargo dice QUÉ y en qué ORDEN; no dice que se pueda empezar ya.* En un
proyecto ajeno —este es del hermano del usuario— y en la primera sesión sobre él, el modo de
trabajo se pregunta antes del primer `write`, no después del primero que el usuario ve.

> ⚠️ **Ninguna regla de `LECCIONES.md` cubre esto.** Lo más cercano es `E1` (comprobar que el
> paso hace falta antes de darlo) y no encaja: aquí el paso hacía falta. Se deja escrito
> como **candidata a regla**, no se fuerza la cita de una que no es — citar una regla sin
> entenderla es precisamente contra lo que avisa la cabecera de `LECCIONES.md`.
>
> *Candidata:* **«Antes del primer cambio en un proyecto que no es tuyo, se acuerda el modo
> de trabajo. El encargo autoriza el destino, no la velocidad.»*

---

## 2. Cuatro documentos declarando «Fase 1 — Diseño» sobre una plataforma construida

> **Una lección escrita no es una lección aprendida.** — rompe **`A9`**, y es la fila de
> `LECCIONES.md §1` que ya llevaba **ocho** repeticiones.

**Qué pasó.** `PROJECT_CONTEXT.md`, `PROJECT_STRUCTURE.md`, `NETWORK_PLAN.md` y
`CLAUDE_CODE_CONTEXT.md` decían **«Estado: Fase 1 — Diseño y Arquitectura»** con fecha
`2026-05-25`. El cuarto ordenaba además, en negrita:

> **«No escribir código de implementación hasta que la Fase 1 esté completa.»**

Debajo de esa frase había 11 módulos de backend, 9 features de frontend, 4 migraciones, dos
auditorías y 27 commits. **Tres meses y medio de mentira**, y nadie la notó.

**Causa.** El estado estaba **copiado en cuatro cabeceras** en vez de vivir en una sola.
Ninguna de las cuatro tenía a nadie encargado de actualizarla, y ningún paso del trabajo
diario obligaba a tocarlas: dependían de acordarse. La pregunta de la fila §1 —*«¿de dónde
saca sus filas, y quién actualiza esa fuente?»*— se responde aquí con **«de nadie»**.

**Lección.** *Cuatro copias de un estado no se arreglan actualizando las cuatro.* El arreglo
es que haya una sola y que las demás apunten a ella — hecho hoy: el estado de fases vive en
`PROJECT_CONTEXT.md` §6 y los otros tres documentos ya no declaran fase.

**⚠️ Pendiente de decisión del usuario:** por `CLAUDE.md`, la segunda vez que se rompe una
regla entra en la tabla de reincidencias de `LECCIONES.md §1`. Esta sería la **novena** de
esa fila. No se ha editado `LECCIONES.md` por cuenta propia: es un archivo compartido por
todos los proyectos y el error lo cometió este, no la sesión de hoy.

---

## 3. La Fase 2 nunca se escribió, y nadie lo echó de menos

**Qué pasó.** `PROJECT_CONTEXT.md` §6 definió **una sola fase**. `NETWORK_PLAN.md` §9 la
cerró y firmó *«Fase 1 COMPLETA → Fase 2 desbloqueada ✅»*. **La Fase 2 no se escribió
jamás.** A partir de ahí se construyó la plataforma entera guiada por `PENDIENTES.md`, que
es una lista de bugs y mejoras — buena para saber qué falta arreglar, incapaz de decir a
dónde va el producto.

**Causa.** El documento que declaraba las fases **no tenía el mecanismo de abrir la
siguiente**. Cerrar la Fase 1 producía la casilla «Fase 2 desbloqueada», y ahí moría: nada
obligaba a que alguien la escribiera.

**Consecuencia medible, y es la cara:** lo que hoy hace falta para que el producto sea
usable —perfil No-Code, documentación por IA, trazas y reporte HTML— **ya estaba prometido
en el §2.1 y el §3 desde mayo**. No se descubrió hoy nada nuevo: se descubrió que llevaba
tres meses escrito y sin construir, porque no había fase que lo reclamara.

**Lección.** *Un plan por fases que no dice quién abre la siguiente se detiene en la
primera.* Cerrar una fase tiene que **producir la siguiente**, no una casilla que la declare
desbloqueada. Escrito hoy como `PROJECT_CONTEXT.md` §6.5.

---

## 4. Cuatro meses sin curva, teniéndola obligada

**Qué pasó.** `CLAUDE.md` exige `curva/AAAA-MM-DD/{buenas,malas}.md` en cada proyecto. Este
llevaba del `2026-05-25` al `2026-08-17` trabajando —incluidas dos auditorías completas— sin
una sola entrada. Se crea hoy la primera.

**Causa.** La misma del punto 2: nada del cierre diario obligaba a escribirla. Las
auditorías sí se documentaron (`audit-*.md`, `Docs/test/`), porque producían un entregable;
la curva no produce nada que nadie pida después.

**Lección.** *Lo que solo se escribe si alguien se acuerda, no se escribe.* Y el coste no es
abstracto: los hallazgos del punto 2 y el 3 llevaban meses a la vista y esta es la primera
vez que alguien los mira, porque **el sitio donde se habrían anotado no existía**.

---

## 5. Se prometió un archivo que no existía

**Qué pasó.** `arrancar.bat` terminaba diciendo *«Para parar: cierra las tres ventanas y
ejecuta `parar.bat`»*. `parar.bat` no existía: se escribió veinte minutos después, y solo
porque al revisar salió a la vista.

**Causa.** Se escribió el mensaje final del script pensando en el flujo completo, no en lo
que había en disco en ese momento. Es `A1` —*verificar en disco antes de afirmar que algo
está*— en su versión hacia el futuro: afirmar que algo estará.

**Lección.** *Un archivo que se nombra en la salida de un programa es una dependencia, no una
promesa.* Si un script cita a otro, el segundo se escribe antes de que el primero lo mencione.

---

## 6. Un `npm run build` que pasa no dice que el proyecto arranque

**Qué pasó.** El backend compiló limpio y se dio por bueno. Al ir a arrancarlo:
`Cannot find module 'dist/main'`. Añadir `prisma/seed.ts` había subido el `rootDir` común, y
toda la salida se había movido a `dist/src/`. **El build no fallaba: fallaba lo que produce.**

**Causa.** Se confundió «compila» con «funciona». Es exactamente `I5` —*auditar el fuente y
ejecutar el binario son dos pruebas distintas*— y también `L2`: el camino nuevo no se probó
con un caso mínimo antes de darlo por hecho.

**Lección.** *Un cambio que toca dónde vive un archivo puede pasar el compilador y romper el
arranque.* Después de mover o añadir algo fuera de `src/`, el chequeo no es compilar: es
**arrancar**. Diez segundos.

---

## 7. Se paró la verificación a mitad y no se retomó

**Qué pasó.** Estaba lanzada la suite de tests del backend cuando el usuario redirigió el
trabajo. Se cambió de tarea y **la suite no se volvió a correr en toda la jornada**. La Fase 4
se cerró con el backend compilando, el frontend con los tipos limpios y nueve comprobaciones
en vivo — pero **sin pasar los tests que ya existían**.

**Causa.** La interrupción fue legítima; no retomarla, no. No había ninguna nota que dijera
«queda esto pendiente», así que dependía de acordarse — y es la tercera vez hoy que algo se
cae por depender de acordarse (ver puntos 2 y 4).

**Lección.** *Una verificación interrumpida no es una verificación aplazada: es una
verificación perdida, salvo que se anote en el momento.* Queda escrito aquí y en el cierre de
la Fase 4 de `PROJECT_CONTEXT.md`, que es donde alguien lo va a leer.

> **Lo mismo aplica a dos cosas más que se cerraron sin ver funcionar:** las trazas de
> Playwright y las descripciones nuevas del grabador. El código está escrito, pero vive en las
> imágenes de executor y recorder, que siguen siendo las de junio. **Están declaradas como no
> verificadas en los tres sitios donde alguien podría creerse lo contrario**: el cierre de la
> Fase 4, el recorrido publicado y aquí.
