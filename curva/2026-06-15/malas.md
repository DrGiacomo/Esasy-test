# Malas — 2026-06-15 · Easy Test

> **Reconstruida el 2026-09-04**, no escrita ese dia. No existian transcripts de chat de
> mayo a julio —las carpetas de sesion estan vacias—, asi que esto sale de `git log`, de
> `Docs/audit-2026-06-15.md`, `Docs/perfeccionar-2026-06-15.md` y 7 commits. Cada entrada dice de donde. **Lo que no consta en una fuente, no esta aqui.**

---

## 1. El resumen del informe no cuadra con su propio cuerpo

**Que paso.** `audit-2026-06-15.md` declara en su cabecera **«27 hallazgos — 12 CRITICO ·
6 ALTO · 6 MEDIO · 3 BAJO»**. Contando las filas de sus tablas hay **28**: la seccion ALTO
tiene **7**, no 6. Se detecto el 2026-09-04, contando a maquina.

**Causa.** El total se escribio a mano y no se volvio a contar al anadir la ultima fila.

**Leccion.** *Un recuento escrito a mano al lado de la lista que cuenta es la definicion de
`V5`: caduca el dia que se escribe.* Y este miente hacia abajo, que es la direccion que nadie
audita (`A9`): promete menos trabajo del que hubo. Si el numero no se genera, no se pone.

## 2. La auditoria la escribio, la corrio y la cerro la misma persona, el mismo dia

**Que paso.** El comando `/audit`, los 28 hallazgos, los tres bloques de arreglo y el
veredicto de «25/27 resueltos» salieron del mismo autor en la misma jornada. **No hubo
material de fuera ni segundo par de ojos.**

**Causa.** No existia otra cosa. Pero eso no cambia como hay que comunicarlo.

**Leccion.** Es `V4` literal: *«¿quien eligio los casos?» se responde con un nombre*, y si
coincide con quien construyo la pieza, **la palabra es «autoevaluacion»**. El numero «25 de
27» es verdad y sigue siendo una autoevaluacion con decimales. Lo que le falta no es rigor:
es un examinador distinto.

## 3. Se cerraron 25 hallazgos sin volver a correr el flujo en vivo

**Que paso.** Los tres bloques tocaron el worker, los gateways, el executor y los tres
servicios de IA. Se anadieron tests unitarios (`test(backend): tests unitarios de
multi-tenant y cancelacion`), pero **el flujo completo no se volvio a ejecutar** hasta el
2026-06-27, doce dias despues.

**Causa.** Los tests unitarios pasaron y se leyeron como verificacion suficiente.

**Leccion.** *Un test unitario verde no dice que el sistema arranque.* La prueba de que no
basta llego sola: uno de los arreglos de este dia —guardar el timer de expiracion en el
objeto sesion— **rompio `POST /recorder/sessions` con un 500** y nadie se entero durante doce
dias. Ver la `malas.md` del 06-27.

> Es `I1`: *un instrumento recien tocado no ha demostrado nada; entre optimizarlo y volver a
> medir con el va su verificacion en condiciones reales.*
