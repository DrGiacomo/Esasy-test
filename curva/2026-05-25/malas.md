# Malas — 2026-05-25 · Easy Test

> **Reconstruida el 2026-09-04**, no escrita ese dia. No existian transcripts de chat de
> mayo a julio —las carpetas de sesion estan vacias—, asi que esto sale de `git log`, de
> `Docs/PROJECT_CONTEXT.md`, `NETWORK_PLAN.md` y `PROJECT_STRUCTURE.md`. Cada entrada dice de donde. **Lo que no consta en una fuente, no esta aqui.**

---

## 1. El primer commit ya desobedecia al documento que traia dentro

**Que paso.** El commit `45d5597` trae a la vez los tres entregables de diseno **y** codigo
de `Backend/`, `Frontend/`, `executor/` y `recorder/`. Dentro de ese mismo commit,
`Docs/CLAUDE_CODE_CONTEXT.md` dice en negrita: *«No escribir codigo de implementacion hasta
que la Fase 1 este completa»*.

**Causa.** La regla se escribio y se rompio en el mismo acto. No hubo un momento entre
escribirla y saltarsela en el que alguien pudiera notarlo.

**Leccion.** *Una regla que nace ya incumplida no se va a cumplir despues.* Si al escribirla
ya no se puede obedecer, o la regla esta mal o el plan lo esta — pero no se guarda como si
fuera a regir manana. Esa frase siguio ahi **tres meses y medio**, sobre una plataforma
entera, hasta que se retiro el 2026-09-04.

> Anotado como reconstruccion: nadie lo noto ese dia. Consta porque el commit lo demuestra.

## 2. No hubo curva ese dia — ni los 100 siguientes

**Que paso.** `CLAUDE.md` exige `curva/AAAA-MM-DD/` en cada proyecto. La primera entrada de
Easy Test es del **2026-09-04**, 102 dias despues del primer commit.

**Causa.** Nada del cierre diario obligaba a escribirla; dependia de acordarse.

**Leccion.** *La curva se abre el dia 1 o no se abre.* Es la misma leccion que este proyecto
volvio a aprender el 06-27 y el 07-12, y por eso estas ocho jornadas hay que reconstruirlas
en vez de leerlas.
