# Malas — 2026-05-26 · Easy Test

> **Reconstruida el 2026-09-04**, no escrita ese dia. No existian transcripts de chat de
> mayo a julio —las carpetas de sesion estan vacias—, asi que esto sale de `git log`, de
> `DESARROLLO.md` (escrito y commiteado este mismo dia, `da3e1c3`). Cada entrada dice de donde. **Lo que no consta en una fuente, no esta aqui.**

---

## 1. `DESARROLLO.md` no lleva ni una fecha dentro

**Que paso.** Documenta siete problemas y ninguno esta fechado. Para reconstruir esta
jornada hubo que preguntarle a git cuando se escribio el archivo (`da3e1c3`, 2026-05-26) y
atribuirle el bloque entero.

**Causa.** Se escribio como *registro tematico* —por componente: recorder, grabaciones,
conversion, ejecucion— en vez de *por jornada*. Ordenar por tema es comodo al escribir y
caro al leer tres meses despues.

**Leccion.** *Un registro sin fecha se convierte en un documento de referencia y deja de ser
una bitacora.* La fecha no es metadato: es lo que permite responder «que aprendimos ese dia».
Aqui se salvo porque el archivo se commiteo una sola vez; si se hubiera ido ampliando, no
habria forma de saber que parrafo es de que dia.

## 2. Tres de los siete problemas eran el mismo error de fondo

**Que paso.** `localhost` dentro del contenedor, nombres de columna en snake_case, y los
`ExecutionResult` inexistentes antes de lanzar: los tres son **el codigo del executor
suponiendo que corre en el mismo sitio y con el mismo contrato que el backend**.

**Causa.** El executor se escribio como si fuera parte del backend, cuando es un proceso
aparte, en otra red y hablando SQL crudo contra la misma base.

**Leccion.** *Cuando tres bugs seguidos son la misma suposicion, el bug no son los tres: es
la suposicion.* `M9` pide medir cuanto explica una causa; aqui la causa comun explicaba el
100 % de los tres, y merecia escribirse como tal en vez de como tres arreglos sueltos.

## 3. Un ejecutable de Windows entro al repositorio

**Que paso.** El commit `chore: add Windows installer executable` metio
`install-easytest.exe` (41 KB) en el arbol, el mismo dia.

**Causa.** Se trato un binario generado como si fuera codigo fuente.

**Leccion.** *Un binario en el repositorio no se versiona: se acumula.* Sigue ahi
104 dias despues, sin que nadie sepa si corresponde al codigo actual — y nadie lo ha
verificado nunca. Un artefacto sin procedencia comprobable es peor que no tenerlo.
