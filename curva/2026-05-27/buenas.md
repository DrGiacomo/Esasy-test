# Buenas — 2026-05-27 · Easy Test

> **Reconstruida el 2026-09-04**, no escrita ese dia. No existian transcripts de chat de
> mayo a julio —las carpetas de sesion estan vacias—, asi que esto sale de `git log`, de
> `git log` (6 commits) y `DESARROLLO.md`. Cada entrada dice de donde. **Lo que no consta en una fuente, no esta aqui.**

---

## 1. Seis commits pequenos y con nombre propio

`correcciones de sesion`, `artefactos en reportes y botones de borrado`, `conectar
ArtifactViewer a TestResultCard`, `grabacion de video por test`, `ejecutar test individual`,
`WebSocket no desconectar singleton`.

**Por que cuenta:** cada uno dice que hace y toca una cosa. Tres meses despues se pueden leer
uno a uno y entender la jornada — que es exactamente lo que se hizo para escribir esto.

## 2. «Ejecutar un test suelto» es una decision de producto, no un arreglo

El commit `feat: ejecutar test individual en lugar de toda la suite` cambia como se usa la
plataforma: antes obligaba a correr la suite entera. Es la clase de friccion que solo se ve
usando el producto.

## 3. El singleton del WebSocket

`fix: WebSocket no desconectar singleton en cleanup`: un `useEffect` cerraba la conexion
compartida al desmontarse **un** componente, tirando la de todos los demas. Encontrarlo
exige entender que el socket vive fuera del ciclo de vida de React.
