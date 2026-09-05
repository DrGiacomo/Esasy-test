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
