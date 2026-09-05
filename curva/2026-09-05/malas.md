# Malas — 2026-09-05 · Easy Test

---

## 1. Reformateé 77 archivos del frontend con la configuración equivocada

**Qué pasó.** Se lanzó `prettier --write` sobre el frontend dando por hecho que tenía
configuración propia. **No la tenía**: prettier usó sus valores por defecto —comillas
dobles, ancho 80— cuando el código estaba escrito con comillas simples. **77 archivos,
2.114 líneas insertadas**, todas de un cambio de estilo que nadie pidió.

Se detectó por casualidad, al leer la salida del comando y notar `import { useState } from
"react"` con comillas dobles.

**Causa.** Se comprobó que el *backend* tenía `.prettierrc` y se asumió que el frontend
también. Nunca se miró. Es `A1` —*verificar en disco antes de afirmar que algo está*— con
la afirmación implícita: dar por hecha la existencia de un archivo de configuración.

**Lección.** *Una herramienta que «arregla» sin configuración no se abstiene: aplica sus
valores por defecto, que son la opinión de otro sobre tu código.* Antes de correr un
formateador sobre código ajeno, se comprueba que exista su configuración — y si no existe,
se escribe primero.

> Revertido con `git checkout` antes de que llegara a ningún commit. El daño fue de
> minutos porque todo estaba commiteado justo antes; sin ese punto de guardado habría
> costado la sesión.

## 2. Elegí un ancho de línea sin medir, y estuvo a punto de colar

**Qué pasó.** Al escribir la configuración nueva, el primer impulso fue dejar el ancho por
defecto (80). Se midió antes: el **p90 del código real está en 81-83 caracteres**. Con 80,
prettier reescribe el 10-15 % de las líneas del proyecto sin ninguna razón.

**Causa.** «80 es lo estándar» es una creencia, no una medida. El proyecto llevaba cuatro
meses escrito con otra costumbre.

**Lección.** *Una configuración de formato no se elige: se mide contra el código que ya
existe.* Cinco líneas de script dieron el número. La diferencia entre 80 y 100 era el
tamaño del diff entre «mecánico y revisable» e «imposible de revisar».

## 3. Puse un `eslint-disable` en el sitio equivocado y no lo comprobé

**Qué pasó.** Se añadió `// eslint-disable-next-line` para un aviso, y quedó **antes del
decorador `@Cron`** en vez de antes del método. La directiva no aplicaba a nada, y eslint
lo reportó como *«Unused eslint-disable directive»* — un error nuevo donde antes había uno.

**Causa.** «Next line» se interpretó como «la línea lógica siguiente» cuando significa
literalmente la siguiente. No se volvió a correr el lint tras añadirla; se dio por hecho.

**Lección.** *Una directiva que silencia un aviso hay que verla silenciarlo.* Es el mismo
error del punto anterior en pequeño: dar por hecho el efecto de algo en vez de mirarlo.
Coste: una vuelta más. Si hubiera pasado desapercibido, habría quedado un comentario que
promete algo que no hace — `A10` en estado puro.

## 4. Empujar al remoto está bloqueado y no lo sabía hasta intentarlo

**Qué pasó.** El usuario pidió commit **y push** a `master`. El commit salió; el push lo
rechazó el clasificador de permisos del entorno. **Dos commits llevan desde entonces solo
en local.**

**Causa.** No se sabe de antemano qué acciones va a bloquear el clasificador, y no hay
forma de consultarlo.

**Lección.** *Cuando una parte del encargo depende de un permiso que no controlas, se dice
en cuanto se sabe y se sigue con el resto* — no se deja el aviso para el resumen final. Se
avisó al momento y se continuó con los puntos 2 a 6, que era lo correcto: `E4`, *un paso
bloqueado por una dependencia externa no bloquea todo*.

## 5. El mensaje del primer commit salió con un `@` suelto delante

**Qué pasó.** Se escribió `git commit -m @'...'@` — sintaxis de **PowerShell** — dentro de
la herramienta **Bash**. Bash no la interpreta: metió el `@` literal como primera línea del
mensaje, convirtiéndolo en el asunto del commit.

**Causa.** Este entorno tiene dos intérpretes y cada uno con su sintaxis para textos de
varias líneas. Se cogió la del otro.

**Lección.** *Con dos intérpretes disponibles, la sintaxis se elige por la herramienta que
se está usando, no por costumbre.* Se corrigió con `--amend` antes de publicar, que solo
fue posible porque el push estaba bloqueado. **Un fallo lo tapó el otro**, y eso es suerte,
no método.

---

## 6. Escribí un comentario que daba por hecho un consumidor que no existe

> **Una lección escrita no es una lección aprendida.** — rompe **`A10`** y **`A1`**.

**Qué pasó.** En `ai.controller.ts`, sobre el endpoint nuevo `GET /ai/estado`, quedó escrito:

> *«El frontend lo pregunta al entrar para no ofrecer botones que van a fallar.»*

**El frontend no lo pregunta.** Ni al entrar ni nunca: no hay una sola llamada a `/ai/estado`
en `Frontend/src`. Se escribió la frase describiendo cómo *debería* funcionar el par
servidor-pantalla, no cómo funciona.

**Causa.** El comentario se redactó a la vez que el endpoint, cuando el consumidor todavía
era una intención. Es `A1` en su versión hacia el futuro —**afirmar que algo estará**— y es
**la segunda vez en dos días**: ayer `arrancar.bat` prometía un `parar.bat` que no existía.
Mismo error, mismo proyecto, dos días seguidos.

**Lección.** *Un comentario se escribe en pasado o no se escribe.* Si describe algo que aún
no ocurre, es una nota de intención y va al documento de pendientes, no al código — en el
código se lee como una descripción de lo que hay.

**Arreglado hoy:** el comentario dice ahora la verdad, con la fecha y el `grep` que lo
comprueba, y el hueco quedó abierto en `PENDIENTES.md §7`.

---

## 7. Al tirar del hilo, la interfaz de IA entera estaba sin montar

**Qué pasó.** Comprobando lo del punto 6 apareció algo bastante más grande: la carpeta
`Frontend/src/features/ai-assistant/` —**4 componentes**: chat, generador de flujos desde
lenguaje natural, mensaje de chat y tarjeta de propuesta de *healing*— **no la importa
ninguna ruta ni ninguna página**.

| Denominador | |
|---|---|
| Operaciones de IA que expone el backend | **5** |
| Operaciones que se pueden usar desde la pantalla | **0** |
| Componentes de IA escritos en el frontend | **4** |
| Componentes montados en alguna ruta | **0** |

Lo único que la aplicación enseña de IA es el texto de `test.documentation` **si el backend
ya lo generó** por su cuenta.

**Causa.** Nadie preguntó nunca *«¿esto se ve?»*. El roadmap declaró la IA **HECHA el
`2026-06-28`** —`4.1`, `4.2`, `4.3`, `4.4`, todas cerradas— y todas se cerraron mirando el
backend. La capacidad «IA Contextual» está prometida en el `§3` de `PROJECT_CONTEXT.md` desde
mayo, y el perfil No-Code del `§2.1` se apoya en ella.

**Lección.** *Un entregable de producto no está hecho cuando responde la API: está hecho
cuando alguien puede llegar a él desde la pantalla.* Es `A3` —leer lo que produce algo antes
de razonar sobre ello— aplicado al otro extremo: **se auditó quién sirve la función y nunca
quién la ofrece**. La pregunta que lo caza, para las demás capacidades del `§3`, es
**«¿desde qué botón llega un usuario a esto?»**, y hay que hacérsela a las nueve.

> No se ha montado nada: la Fase 5 es instalación, no producto, y ampliar el alcance por
> cuenta propia es lo que se hizo mal ayer (punto 1 de la curva del `09-04`). Queda abierto
> con su denominador en `PENDIENTES.md §7`.

---

## 8. El apagón demostró que el punto de guardado estaba donde tocaba, por poco

**Qué pasó.** El corte pilló `5.2` y `5.3` escritos y **sin commitear**: 5 archivos
modificados y un script nuevo sin trackear. No se perdió nada porque los cambios estaban en
disco, pero **nada de eso lo garantizaba el método** — lo garantizó que Windows no tocara los
archivos.

**Causa.** Se encadenaron dos entregables enteros (script nuevo + IA opcional + `arrancar.bat`)
sin un commit intermedio, y ninguno estaba verificado, así que tampoco había un punto natural
donde parar a guardar.

**Lección.** *El trabajo sin commitear es trabajo que solo existe si nadie apaga la luz.* Es
la fila de `LECCIONES.md §1` de **los tres trabajos largos perdidos**, y su matiz —*la
granularidad del guardado tiene que ser menor que lo que duele perder*— aquí se traduce a
**un entregable, un commit**: `5.2` y `5.3` son dos, y se estaban tratando como uno.

---

## 9. `parar.bat` mato Docker Desktop entero

> **Rompe `D1`** —*validar antes de destruir*— y es de las peores: no fallo el arranque,
> fallo la PARADA, que es justo lo que uno ejecuta cuando ya no esta mirando.

**Qué pasó.** El `parar.bat` mataba «lo que estuviera escuchando en los puertos 3000 y 5173»,
sin mirar qué era. En el modo de desarrollo eso es Node y está bien. **En el arranque
unificado ese puerto lo publica Docker**, así que el script mató un proceso del motor y
dejó la máquina **sin Docker**, con este resultado en la pantalla:

```
  [-] parando el proceso 25312 del puerto 3000
  [-] Docker no respondio - puede que ya estuviera parado
```

La segunda línea es la confesión: no es que Docker no respondiera, es que **acababa de
matarlo el propio script**, y su mensaje culpaba a otro.

**Causa.** El script se escribió para el modo viejo —tres procesos de Node en tres ventanas—
y se **heredó tal cual** al modo nuevo, donde el dueño de esos puertos ya no es el mismo. Un
comportamiento correcto en un contexto se dio por correcto en el otro sin volver a mirar.

**Lección.** *Matar por puerto es matar a un desconocido.* Un puerto no identifica a un
proceso: identifica una plaza que ocupa cualquiera. Antes de un `taskkill` se comprueba
**qué** hay ahí — `tasklist /FI "PID eq N"` — y si no es lo que se esperaba, no se toca y se
dice de quién era.

**Arreglado el mismo día**, con la explicación dentro del propio archivo para el que venga
después. Y hay una segunda mitad de la lección, más incómoda: **el script ya avisaba de esto
en un comentario** —«por puerto y no por taskkill node.exe: eso mataría cualquier otro Node
que tengas abierto»—. Sabía que matar a ciegas era peligroso, protegió el caso que imaginó su
autor y no el que llegó. Es `S12` en estado puro.
