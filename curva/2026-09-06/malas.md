# Malas — 2026-09-06 · Easy Test

---

## 1. El primer mensaje «en cristiano» salió mal escrito, y solo se vio ejecutándolo

**Qué pasó.** La primera versión del traductor de errores metía la descripción del paso dentro
de la frase como si fuera un sustantivo. Resultado en pantalla:

> «No se encontro **Pulsar el elemento «flash object»** en la pagina despues de 5 segundos.»

**Causa.** La descripción **ya trae su verbo dentro** («Pulsar…», «Ir a…»), y se usó como
sujeto de otra frase. Al escribirla se pensó en el dato —el nombre del elemento— y no en la
cadena real que iba a producir.

**Lección.** *Un mensaje para personas se lee, no se compone.* Un texto que se arma juntando
trozos hay que verlo montado antes de darlo por bueno: leer el código no basta, porque en el
código cada trozo tiene sentido. Se arregló **citando** la descripción en vez de encajarla:
«El paso «…» no se pudo hacer: …».

**Y lo que lo salvó:** provocar un fallo a propósito y mirar la frase resultante en la base.
Sin esa ejecución, el mensaje habría llegado así al usuario — que es exactamente a quien
pretendía ayudar.

## 2. Añadí una variable de entorno que no llegaba a donde tenía que llegar

**Qué pasó.** Se hizo configurable la espera de cada paso con `STEP_TIMEOUT_MS`… y el executor
nunca la recibía. El worker construye la lista de variables del contenedor **una por una**, y
la nueva no estaba en esa lista.

**Causa.** Se dio por hecho que una variable de entorno «está disponible» en todo el sistema.
En un contenedor no: **solo existe lo que alguien le pasa explícitamente**.

**Lección.** *Una variable de entorno nueva tiene dos extremos: donde se lee y donde se pasa.*
Es la fila de `LECCIONES.md §1` con diez repeticiones —*aplicar algo en unos sitios y no en
todos*— en su versión más pequeña. La pregunta que la caza: **«¿por cuántos sitios entra y sale
esto?»** — por tres: el compose, el worker y el executor.

**De paso**, las dos variables nuevas se añadieron a la lista de nombres reservados: un secreto
del usuario llamado `STEP_TIMEOUT_MS` no puede pisarlas.

---

## 3. La transición que añadí dejó media pantalla en blanco

**Qué pasó.** El componente de transición envuelve al `Outlet` en un `div`. Ese `div` no tenía
altura propia, así que las páginas que piden `h-full` —el grabador, el editor de flujo— se
quedaron **sin altura y colapsaron al tamaño de su contenido**, dejando media pantalla vacía.

**Causa.** Se metió una capa nueva en el árbol sin comprobar qué dependía de la anterior. `h-full`
es «el 100 % de la altura de mi padre»: al meter un padre sin altura, la cadena se rompe entera.

**Lección.** *Meter un contenedor en medio de un árbol de layout rompe todo lo que medía contra
el padre.* Después de envolver algo, se abre la pantalla más alta que haya —aquí el grabador— y
se mira. No lo cazó ningún test: **lo cazó una captura del usuario**, dos horas después.

## 4. Dije que el header estaba arreglado, y solo había cambiado de blanco a casi blanco

**Qué pasó.** El barrido de color convirtió `bg-white` en `bg-tinta-50` (`#FBF8F4`). Técnicamente
otro color; a la vista, el mismo blanco. El usuario tuvo que decir **dos veces** que el header
seguía blanco.

**Causa.** Se comprobó que el valor había cambiado, no que **se viera** distinto. Un reemplazo
masivo cambia cadenas; que el resultado se distinga es otra pregunta y hay que hacérsela.

**Lección.** *Cambiar un valor no es cambiar un resultado.* En un cambio visual, la verificación
es mirar — y si el usuario repite una queja que se dio por resuelta, **lo que falló no fue el
arreglo: fue la comprobación**.

## 5. Tres valores de color corruptos al escribir archivos

**Qué pasó.** Tres veces en la jornada se coló basura al generar código:

| Dónde | Qué salió | Por qué |
|---|---|---|
| `docker-compose.yml` | `C:` + byte de campana | `\a` interpretado como escape |
| `nginx.conf` (comentario) | `#B7A characteristics` | texto pegado en medio de un valor |
| `index.css` | `#B4ararara` | lo mismo |

Los tres se cazaron: dos por validación (`docker compose config`, el lint) y uno por releer.

**Lección.** *Un archivo generado se valida con la herramienta que lo va a leer, no releyéndolo.*
`docker compose config`, `tsc`, el lint. Y en las rutas de Windows dentro de código: **barras
normales o dobles**, nunca una sola barra invertida seguida de letra.

## 6. La primera versión de la vista del flujo no era un diagrama

**Qué pasó.** Se pidió «el diagrama de Alma con la lógica de aquí» y se entregaron **seis fichas
en una rejilla**. El usuario: *«flujo no es un diagrama interactivo»*.

**Causa.** Se cogió el dato correcto —las seis paradas y sus contadores— y se resolvió con el
componente más cómodo. Una rejilla de tarjetas es una **lista**: no dice qué va después de qué,
ni que hay un ciclo, ni por qué se pasa de una a otra. **Lo que hace diagrama a un diagrama son
las flechas**, y eso era justo lo que no tenía.

**Lección.** *Cuando alguien pide un diagrama, lo que pide son las relaciones, no las cajas.* Si
lo dibujado se puede leer igual de bien en una lista, no es un diagrama: es una lista con
bordes redondeados.
