# Malas — 2026-05-28 · Easy Test

> **Reconstruida el 2026-09-04**, no escrita ese dia. No existian transcripts de chat de
> mayo a julio —las carpetas de sesion estan vacias—, asi que esto sale de `git log`, de
> unicamente `git log` — no hay documento de esta jornada. Cada entrada dice de donde. **Lo que no consta en una fuente, no esta aqui.**

---

## 1. Un commit que toca los cuatro componentes a la vez

**Que paso.** `d19d593` mezcla tres cosas sin relacion entre si: cancelar/borrar, optimizar
el executor y hacer resiliente el WebSocket. Tres razones distintas para cambiar, en un solo
commit, sobre cuatro carpetas.

**Causa.** Se commiteo al final de la jornada, por acumulacion, en vez de por unidad de
cambio.

**Leccion.** *Un commit que mezcla tres motivos no se puede revertir sin perder dos cosas
buenas.* Y hoy, al reconstruir: de este dia no se puede saber que se rompio, porque los tres
cambios llegaron juntos y ninguno se puede aislar.

## 2. El registro de esta jornada es **una sola linea**

**Que paso.** No hay documento, no hay notas, no hay transcript. Lo unico que existe del 28
de mayo es el titular de su commit.

**Causa.** La misma de los tres dias anteriores, ya sin novedad: no habia curva.

**Leccion.** *Se dice y no se rellena.* Esta jornada cerro el flujo core del producto y **no
se puede contar que costo**. Antes que inventar una reconstruccion plausible, se deja escrito
que aqui falta informacion — un hueco declarado vale mas que un relato inventado (`G3`).
