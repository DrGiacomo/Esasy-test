# Malas — 2026-05-27 · Easy Test

> **Reconstruida el 2026-09-04**, no escrita ese dia. No existian transcripts de chat de
> mayo a julio —las carpetas de sesion estan vacias—, asi que esto sale de `git log`, de
> `git log` (6 commits) y `DESARROLLO.md`. Cada entrada dice de donde. **Lo que no consta en una fuente, no esta aqui.**

---

## 1. Una funcionalidad se dio por hecha y hubo que reconectarla acto seguido

**Que paso.** El commit `7746114` («artefactos en reportes y botones de borrado») fue seguido
inmediatamente por `6c0323e` («fix: conectar ArtifactViewer a TestResultCard»). La pieza se
construyo y **no estaba enchufada a la pantalla que la usa**.

**Causa.** Se dio por terminada al escribirla, sin abrirla en la UI. Es `I5` en pequeno:
*auditar el fuente y ejecutar son dos pruebas distintas*.

**Leccion.** *Un componente que no se ha visto renderizado no esta hecho.* El coste aqui fue
de minutos; el mismo patron el 06-27 costo un endpoint roto durante 12 dias.

## 2. La jornada entera se dedujo de los mensajes de commit

**Que paso.** De este dia no queda **ninguna** nota. `DESARROLLO.md` ya se habia commiteado
el dia anterior y no se volvio a tocar. Lo que se sabe del 27 de mayo son seis titulares de
commit.

**Causa.** El registro del 05-26 se leyo como «ya esta documentado el proyecto» en vez de
«hay que seguir registrando». Un documento tematico da esa sensacion; una bitacora fechada,
no.

**Leccion.** *Escribir un buen registro una vez reduce las ganas de escribir el siguiente.*
Es el efecto contrario al que uno espera, y por eso la curva tiene que ser un paso del
cierre diario y no un acto de voluntad.
