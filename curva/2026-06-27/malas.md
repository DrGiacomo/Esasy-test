# Malas — 2026-06-27 · Easy Test

> **Reconstruida el 2026-09-04**, no escrita ese dia. No existian transcripts de chat de
> mayo a julio —las carpetas de sesion estan vacias—, asi que esto sale de `git log`, de
> `Docs/test/01`–`05` (la tanda en vivo de ese dia) y 2 commits. Cada entrada dice de donde. **Lo que no consta en una fuente, no esta aqui.**

---

## 1. Un arreglo del 06-15 rompio el flujo de grabacion y nadie lo supo en 12 dias

**Que paso.** El 15 de junio se hizo cancelable el timer de auto-expiracion guardandolo en
`session.expireTimer`. Ese objeto es el que el controller **devolvia crudo**, y NestJS le
hace `JSON.stringify`: `Converting circular structure to JSON`. Resultado: `POST
/recorder/sessions` devolvia **500 siempre**, era **imposible iniciar una grabacion**, y
ademas dejaba el contenedor recorder huerfano. Se descubrio el 27 de junio.

**Causa.** El arreglo del 06-15 se verifico con tests unitarios y no volviendo a usar el
flujo. Nadie inicio una grabacion entre el 15 y el 27.

**Leccion.** *Un arreglo en una zona con estado compartido es un cambio nuevo, no una
reparacion* (`D5`): no hereda la confianza del bug que cerro. Y el detector no es un test
unitario — es **volver a hacer lo que hace un usuario**. Doce dias con la funcionalidad
principal muerta y el equipo creyendo que estaba mejor que antes.

## 2. `master` no compilaba, y llevaba asi quien sabe cuanto

**Que paso.** El primer intento de `npm run build` del frontend fallo con un error de tipos
**preexistente en `master`**: el estado exigia `suite` como obligatorio y `testsApi.getOne()`
no la devuelve. El propio codigo ya trataba `suite` como opcional, con un fallback y un cast
`as unknown as` — es decir, **el tipo estaba mal y habia dos parches encima**.

**Causa.** No habia CI. Nada obligaba a que `master` compilara, asi que dejo de hacerlo sin
que se notara. Y no se sabe desde cuando: no hay forma de fecharlo.

**Leccion.** *Una rama principal sin puerta se rompe y no avisa.* El CI se creo **ese mismo
dia** (`1.1` del roadmap), y su primer trabajo fue impedir que volviera a pasar. El detalle
que duele: el cast `as unknown as` era la senal de que el tipo mentia, y llevaba tiempo ahi
sin que nadie tirara del hilo (`A8`).

## 3. La prueba de grabacion valida el cableado, no la grabacion

**Que paso.** La tanda declara `04-flujo-grabacion` como ✅, y esta bien declarado — pero lo
que valida es infra + persistencia + conversion. **La captura real de pasos por CDP no se
probo**, y la grabacion salio con 0 pasos.

**Causa.** Conducir el navegador con interacciones reales exige montar mas que un script.

**Leccion.** *Un OK con su punto ciego escrito es honesto; el riesgo es el resumen.* El
`README.md` del indice pone «⚠️→✅ Encontrado y arreglado un 500; ahora funciona» — y «ahora
funciona» ya no lleva el punto ciego pegado. **El matiz sobrevive en el detalle y muere en el
resumen**, que es donde todo el mundo lo lee (`E10`, `V1`).
