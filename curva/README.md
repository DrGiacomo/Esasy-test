# Curva de aprendizaje — Easy Test

Doce jornadas, del `2026-05-25` al `2026-09-04`. Cada una con `buenas.md` y `malas.md`,
**siempre las dos**.

> ⚠️ **Once de las doce se escribieron el 2026-09-04, no el día que ocurrieron.** El proyecto
> vivió 102 días sin bitácora. Esto es una reconstrucción, y por tanto **no todas las
> jornadas valen lo mismo**: la tabla de abajo dice de qué se reconstruyó cada una, para que
> nadie las lea como si fueran notas tomadas en el momento.

## De dónde sale cada jornada

| Jornada | Fuente | Fiabilidad |
|---|---|---|
| `2026-05-25` | `git log` + los tres documentos de diseño | **Alta** — el commit demuestra lo que se afirma |
| `2026-05-26` | **`DESARROLLO.md`**, escrito y commiteado ese mismo día | **La más alta.** Es la única jornada con registro contemporáneo: 7 problemas con causa y solución |
| `2026-05-27` | Solo los mensajes de 6 commits | **Media** — se sabe qué se hizo, no qué costó |
| `2026-05-28` | Un solo mensaje de commit | **Baja.** Está declarado dentro: de este día falta información y no se ha inventado |
| `2026-06-15` | `audit-2026-06-15.md` + `perfeccionar-2026-06-15.md` | **Alta** — 28 hallazgos con archivo y línea |
| `2026-06-27` | **`Docs/test/01`–`05`**, la tanda en vivo | **Alta** — con entorno, comandos y salidas reales |
| `2026-06-28` | `PENDIENTES.md` + 2 commits | **Alta** — cada entrada dice cómo se cerró |
| `2026-07-12` | `audit-2026-07-12.md` | **Alta** — 24 hallazgos, y su total sí cuadra |
| `2026-08-13` | Transcript de sesión `ff613d0b` | **Media-alta** — se conserva el razonamiento, no el detalle técnico |
| `2026-08-17` | Transcript `bbe6bb49` + commit `fa1d7fb` | **Alta** |
| `2026-08-25` | Transcript `7e8b996c` | **Media** — Easy Test aparece como material de otro proyecto, no como trabajo propio |
| `2026-09-04` | **Escrita el mismo día** | **La única contemporánea además del 05-26** |

## Lo que no se pudo rescatar

**No existen transcripts de chat de mayo, junio ni julio.** Las carpetas de sesión de esos
meses están vacías; la única con contenido empieza el `2026-08-06`. Todo lo anterior se
reconstruyó de documentos y de git.

Consecuencia concreta: **se sabe qué se decidió y no por qué**. Los documentos guardan el
resultado; la conversación que lo produjo se perdió.

## Lo que se comprobó antes de escribir esto

Las nueve fuentes documentales se auditaron el `2026-09-04` antes de reconstruir nada:

| Comprobación | Resultado |
|---|---|
| Corrupción de codificación o truncado | **0** en los 9 archivos |
| Rutas citadas que ya no existen en disco | **0 de 39** |
| Fechas afirmadas que no caen en días con commits | **0** |
| Afirmaciones de «RESUELTO» verificadas contra el código | **11 de 11 ciertas** |
| Totales declarados que no cuadran con su propio cuerpo | **1** — ver abajo |

**El único defecto encontrado:** `audit-2026-06-15.md` declara **27 hallazgos** en su
cabecera y su cuerpo tiene **28** (la sección ALTO lista 7, no 6). Está anotado en la
`malas.md` de esa jornada y **no se ha corregido el documento original**: un informe de
auditoría es un registro histórico, y reescribirlo tres meses después lo convertiría en otra
cosa.

## Los tres errores que más se repitieron

Contados sobre las doce jornadas, no sobre la impresión:

| Veces | El error |
|---|---|
| **4** | **Dar por verificado algo porque compila o porque pasan los tests unitarios**, sin volver a correr el flujo real. `06-15`, `06-28`, `07-12` y `09-04` |
| **3** | **Un número escrito a mano que no cuadra con lo que cuenta**: el «27» del audit de junio, el «~95 % / ~90 %» del `06-28`, y las cuatro cabeceras que decían «Fase 1» durante tres meses |
| **2** | **Un arreglo que rompió otra cosa y nadie se enteró durante días**: el timer del `06-15` que mató el flujo de grabación 12 días, y el `seed.ts` del `09-04` que movió la salida del build |
