# Buenas — 2026-08-17 · Easy Test

> **Rescatada el 2026-09-04 del transcript de sesion** `bbe6bb49`
> (`~/.claude/projects/C--Proyectos/`). Es la unica fuente que sobrevive de este dia junto
> con el commit `fa1d7fb`. **Lo que no consta en el transcript, no esta aqui.**

---

## 1. Las politicas RLS entraron al repositorio

Commit `fa1d7fb`: **«Politicas RLS de Postgres, tsconfig y pendientes al dia»**. Cuatro
archivos. Es el ultimo commit de Easy Test antes de septiembre, y cierra lo que despues se
llamo **Fase 3**.

## 2. Se cerro el circulo del diseno de mayo

`PROJECT_CONTEXT.md` §6.1 declaro en mayo, como entregable de la Fase 1, una *«estrategia
conceptual de Row-Level Security»*. Este dia dejo de ser conceptual: las politicas SQL
existen en `Backend/prisma/rls/`.

Tres meses entre declarar la estrategia y escribirla, pero se escribio.

## 3. La jornada fue de poner a salvo lo que solo vivia en el disco

Easy Test fue uno de cuatro proyectos revisados ese dia con la misma pregunta: **que hay en
esta maquina que no este en ningun repositorio**. RUKIA subio su `datos_demo.py` de 285
lineas; MILA, cuatro documentos; Estanislao y exp2 se subieron enteros (167 y 395 archivos).

**Por que cuenta:** al terminar, *«los 6 proyectos vivos estan en GitHub»*. Antes de ese dia,
trabajo de meses dependia de que este disco no fallara.
