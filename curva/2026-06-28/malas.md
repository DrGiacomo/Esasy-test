# Malas — 2026-06-28 · Easy Test

> **Reconstruida el 2026-09-04**, no escrita ese dia. No existian transcripts de chat de
> mayo a julio —las carpetas de sesion estan vacias—, asi que esto sale de `git log`, de
> `Docs/PENDIENTES.md` y 2 commits. Cada entrada dice de donde. **Lo que no consta en una fuente, no esta aqui.**

---

## 1. «MVP funcional ~95 % · grado produccion ~90 %», escrito a mano

**Que paso.** Al cerrar el roadmap se escribio en `PENDIENTES.md`: *«Avance estimado: MVP
funcional ~95 % · Producto grado produccion ~90 %»*. Dos numeros sin metodo, sin
denominador y sin fecha de caducidad.

**Causa.** Cerrar catorce entradas de una lista se sintio como estar al 95 % del producto. La
lista era de bugs y mejoras conocidos — no de lo que el producto necesita.

**Leccion.** *Un porcentaje de avance sin denominador es una sensacion con decimales*
(`V1`). La prueba: **catorce dias despues, la auditoria del 07-12 encontro 24 hallazgos
nuevos, 5 de ellos criticos**, sobre ese mismo producto «al 90 % de grado produccion». El
numero no era mentira; es que no medía nada.

## 2. Catorce entradas cerradas en un dia, y ninguna probada en vivo

**Que paso.** Selectores robustos, self-healing automatico, Gemini multimodal, push real a
Git, limpieza de artefactos. Todo entro el mismo dia. La ultima ejecucion en vivo era del dia
anterior, **antes** de estos cambios.

**Causa.** La tanda de pruebas del 06-27 se leyo como «ya esta probado», cuando probaba el
codigo de antes.

**Leccion.** *Probar el jueves no prueba lo del viernes.* Y hay una consecuencia concreta y
todavia viva: **los selectores robustos y el self-healing automatico viven en las imagenes de
executor y recorder, que no se han reconstruido**. Estan escritos, commiteados, marcados como
HECHO — y a fecha de hoy **nadie los ha visto funcionar**. Setenta dias asi.

## 3. Se cerro un pendiente declarandolo fuera de alcance sin decirlo asi

**Que paso.** El pendiente del lint quedo como *«no es gate de CI por un desajuste
pre-existente CRLF/prettier en todo el repo — requeriria un reformat global»*, dentro de la
misma frase que anuncia que se cerro TODO el roadmap.

**Causa.** Un obstaculo real, decidido razonablemente, pero **contado como inciso dentro del
relato de lo que salio bien**.

**Leccion.** Es `E10` exacta: *un error contado dentro del relato de lo bueno no se lee como
un error, se lee como una anecdota que adorna el exito*. Los ~444 errores de lint siguen ahi
hoy, y la frase que los menciona sigue empezando por «cerrados TODOS los pendientes».
