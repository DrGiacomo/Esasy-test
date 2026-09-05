# Buenas — 2026-05-26 · Easy Test

> **Reconstruida el 2026-09-04**, no escrita ese dia. No existian transcripts de chat de
> mayo a julio —las carpetas de sesion estan vacias—, asi que esto sale de `git log`, de
> `DESARROLLO.md` (escrito y commiteado este mismo dia, `da3e1c3`). Cada entrada dice de donde. **Lo que no consta en una fuente, no esta aqui.**

---

## 1. El flujo core entero, funcionando, en un dia

Grabar -> convertir -> ejecutar, de punta a punta: contenedor recorder con CDP, streaming de
frames por WebSocket, persistencia de la grabacion, conversion a test ejecutable y ejecucion
en Docker con Playwright.

## 2. Se escribio el registro **el mismo dia**, con causa y solucion

`DESARROLLO.md` documenta **siete problemas** con la estructura *problema -> causa ->
solucion*, que es exactamente el formato de una `malas.md` sin saberlo. Tres ejemplos:

| Problema | Causa real |
|---|---|
| El video del grabador salia en blanco | `page.goto()` estaba dentro del handler `connect`: el stream arrancaba sobre una pagina vacia |
| El navegador remoto no respondia a clicks | `RemoteBrowserFrame` era una `<img>` estatica, sin handlers |
| El executor fallaba en silencio (exit 1, sin logs) | Tres errores encadenados: `localhost` dentro del contenedor, columnas SQL en snake_case, y los `ExecutionResult` no existian antes de lanzar el contenedor |

**Por que cuenta como bueno:** es `S11` —*lo que solo se puede capturar en el momento se
captura en el momento*—. Sin esto, esta jornada seria hoy una linea de `git log`.

## 3. El diagnostico llego a la causa, no al sintoma

El caso del executor mudo es el mejor: tres fallos distintos escondidos detras del mismo
sintoma (exit code 1, sin salida). Se separaron y se arreglaron uno a uno en vez de parchear
el sintoma.
