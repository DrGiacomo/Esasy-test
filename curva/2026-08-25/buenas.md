# Buenas — 2026-08-25 · Easy Test

> **Rescatada el 2026-09-04 del transcript de sesion** `7e8b996c`
> (`~/.claude/projects/C--Proyectos/`). Es la unica fuente que sobrevive de este dia junto
> con nada mas — no hay commits de Easy Test este dia. **Lo que no consta en el transcript, no esta aqui.**

---

## 1. Easy Test sirvio de material de examen para otro proyecto

**No fue una jornada de trabajo sobre Easy Test.** Se uso como uno de los seis proyectos
sobre los que medir cuantos archivos podia abrir el motor de `Estanislao`. Easy Test aporto
24 archivos al banco de pruebas.

**Por que cuenta como bueno:** es lo que `V6` pide —*pasar un trabajo por material que nadie
preparo para el*—. El instrumento se probo contra documentos reales de seis proyectos
distintos, no contra ejemplos escritos para el.

## 2. El resultado de Easy Test fue estable, que era lo interesante

| Momento | Archivos que se abren |
|---|---|
| Al empezar | 11 de 24 |
| Tras arreglar dos defectos del instrumento | 11 de 24 |
| Tras reclasificar la fontaneria | **11 de 23** |

Arreglar el instrumento **no movio el numero**, y eso es informacion: confirmaba que los 13
que no se abrian no era por un fallo del lector.

## 3. Se descubrio que `.yml` no es documentacion

`ci.yml`, `docker-compose.yml` y `docker-compose.dev.yml` se estaban contando como material
que el motor deberia poder leer. Son fontaneria. Al sacarlos, Easy Test paso de 24 a 23
archivos evaluables y **la fila entera de `.yml` desaparecio**.

**Por que cuenta:** es el denominador corrigiendose. Un porcentaje sobre 24 y otro sobre 23
son numeros distintos aunque el numerador no se mueva (`V1`).
