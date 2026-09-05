# Malas — 2026-08-13 · Easy Test

> **Rescatada el 2026-09-04 del transcript de sesion** `ff613d0b`
> (`~/.claude/projects/C--Proyectos/`). Es la unica fuente que sobrevive de este dia junto
> con `Docs/PENDIENTES.md`. **Lo que no consta en el transcript, no esta aqui.**

---

## 1. Tres meses con el mismo stack duplicado sin que nadie lo mirara

**Que paso.** Easy Test y Reqora comparten NestJS, PostgreSQL, JWT y el mismo patron de
guards. Se construyeron por separado, en meses distintos, **sin compartir una linea**. Nadie
lo habia notado hasta que se pusieron los dos documentos uno al lado del otro.

**Causa.** No habia ningun momento en el flujo de trabajo en que se mirara la cartera
completa. Cada proyecto se abria solo.

**Leccion.** Es el corolario incomodo del §11: *la mayoria de los callejones sin salida no
fueron fallos de metodo, sino de no haber mirado algo que estaba ahi para mirarse.* Veinte
minutos de comparacion revelaron mas desperdicio que semanas de trabajo dentro de cada
proyecto.

## 2. El pendiente del seed nacio con estimacion y sin fecha de revision

**Que paso.** Se anadio a `PENDIENTES.md` con **«Estimado: 30-45 min»**. Se cerro el
2026-09-04: **22 dias despues**.

**Causa.** La estimacion era razonable —y resulto acertada—, pero la entrada no llevaba nada
que la volviera a poner delante. Se quedo arriba del documento, visible, y no se hizo.

**Leccion.** *Una estimacion pequena no acelera nada por si sola; a veces la retrasa.* «Son
40 minutos» se lee como «cabe cuando sea», y por eso nunca es hoy. Lo que mueve un pendiente
no es su coste: es que algo obligue a mirarlo.

## 3. Esta jornada tampoco dejo curva

**Que paso.** Se produjo un documento de cartera (`TRASPLANTES_CRUZADOS.md`) y se anadieron
pendientes a varios proyectos, pero **ninguno de los nueve recibio entrada de curva ese dia**.

**Causa.** El trabajo era transversal y no «pertenecia» a ningun proyecto, asi que no se
anoto en ninguno.

**Leccion.** *El trabajo que cruza proyectos es el que mas facil se pierde, porque no tiene
carpeta.* Y es el mas caro de repetir: reconstruirlo exigio leer el transcript entero.
