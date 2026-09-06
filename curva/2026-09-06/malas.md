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
