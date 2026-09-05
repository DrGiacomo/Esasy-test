# Buenas — 2026-06-27 · Easy Test

> **Reconstruida el 2026-09-04**, no escrita ese dia. No existian transcripts de chat de
> mayo a julio —las carpetas de sesion estan vacias—, asi que esto sale de `git log`, de
> `Docs/test/01`–`05` (la tanda en vivo de ese dia) y 2 commits. Cada entrada dice de donde. **Lo que no consta en una fuente, no esta aqui.**

---

## 1. Se probo en vivo, con Docker, y se escribio lo que salio

Cinco documentos, uno por prueba, con entorno declarado (Windows 11, Node v24, Docker
29.5.3, Postgres 16 + Redis 7), la rama, y **como reproducirlo**. Mas dos scripts
(`_run-flow.mjs`, `_run-recorder.mjs`) para que no dependa de la memoria de nadie.

**Por que cuenta:** es `V5` bien hecha —el numero lleva el comando que lo produce— y es lo
que hizo posible reconstruir esta jornada tres meses despues.

## 2. Correr de verdad destapo dos bugs que ningun test unitario vio

| Bug | Gravedad |
|---|---|
| `POST /recorder/sessions` devolvia **500** por estructura circular (`Timeout`) | El flujo de grabacion estaba **roto de punta a punta** |
| El **frontend no compilaba en `master`** (error de tipos en `TestDetailPage.tsx`) | El job de CI del frontend nacia en rojo |

Los dos se arreglaron el mismo dia y se re-verificaron.

## 3. Se declaro lo que la prueba NO cubria

`04-flujo-grabacion.md` dice explicitamente: *«no simula interaccion real del usuario (eventos
CDP), asi que la grabacion sale con 0 pasos — esperado»*, y cierra con una seccion
**«Pendiente de probar»**.

**Por que cuenta:** es `M7` —*todo criterio declara su punto ciego*—. Sin esa frase, «flujo de
grabacion OK» habria significado algo que no era.

## 4. La causa raiz del 500 se persiguio hasta su origen

No se quedo en «el controller devolvia mal»: llego hasta *«regresion probable del cambio
"expire timer cancelable" del audit 2026-06-15»*. Nombrar el cambio que lo causo es lo que
convierte un arreglo en un aprendizaje.
