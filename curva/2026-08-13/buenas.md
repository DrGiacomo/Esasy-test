# Buenas — 2026-08-13 · Easy Test

> **Rescatada el 2026-09-04 del transcript de sesion** `ff613d0b`
> (`~/.claude/projects/C--Proyectos/`). Es la unica fuente que sobrevive de este dia junto
> con `Docs/PENDIENTES.md`. **Lo que no consta en el transcript, no esta aqui.**

---

## 1. Easy Test se miro por primera vez junto a los otros ocho proyectos

La jornada no fue de tocar codigo: fue de poner los nueve proyectos de la cartera lado a lado
y preguntarse **que se puede trasplantar de uno a otro**. Salio
`C:\Proyectos\Docs\TRASPLANTES_CRUZADOS.md` y diez piezas trasplantables.

**Por que cuenta:** es la gula de conocimiento (§11 de `LECCIONES.md`) aplicada a la cartera
entera. Nada de esto requeria medir: estaba en los archivos, sin mirar.

## 2. Easy Test resulto ser un **donante**, no solo un receptor

Dos de sus decisiones de diseno se identificaron como lo mejor de la cartera para llevarse a
otros proyectos:

| Pieza de Easy Test | Que tapa en otro proyecto |
|---|---|
| **Contrato del proveedor de IA** con tokens y latencia obligatorios | MILA no sabe lo que le cuesta cada consulta |
| **«La IA propone, un humano aprueba»** | MILA deja que la IA ejecute directamente |

El segundo es la decision central de Easy Test —el self-healing que **nunca** auto-aplica— y
resulto ser exportable como patron de seguridad a un proyecto que no tiene nada que ver.

## 3. El hallazgo del dia, y es sobre Easy Test

> *«Easy test y Reqora son el mismo stack exacto (NestJS + PostgreSQL + JWT + guards) y no
> comparten ni una linea. Ahi esta casi todo el desperdicio de la cartera.»*

Es el unico par de proyectos donde el trasplante **no es portar un patron: es copiar el
archivo**. Y es justo el par que nunca se habia cruzado.

## 4. De ahi salio el pendiente del seed

El cruce #5 (`S.A.A.I -> todos`) anadio a `PENDIENTES.md` los **datos de demostracion**, con
el patron de `datos_demo.py` ya verificado ese dia en RUKIA: idempotente, marca `[demo]`,
`--borrar`, cuenta una historia y **se niega si la base tiene datos reales**.

Ese pendiente se cerro el 2026-09-04, y las cinco salvaguardas se copiaron tal cual.
