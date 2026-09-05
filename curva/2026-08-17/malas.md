# Malas — 2026-08-17 · Easy Test

> **Rescatada el 2026-09-04 del transcript de sesion** `bbe6bb49`
> (`~/.claude/projects/C--Proyectos/`). Es la unica fuente que sobrevive de este dia junto
> con el commit `fa1d7fb`. **Lo que no consta en el transcript, no esta aqui.**

---

## 1. Las politicas RLS llevaban **dos meses escritas y sin versionar**

**Que paso.** El transcript lo dice con todas las letras: *«Easy test — las politicas RLS de
Postgres, **sin versionar desde junio**»*. Existian en el disco desde junio y solo entraron a
git el 17 de agosto.

**Causa.** Se escribieron como archivos `.sql` sueltos, fuera del flujo normal de codigo, y
nada las arrastro a un commit. No estaban en `.gitignore`: simplemente nunca se anadieron.

**Leccion.** *Un archivo que no produce ningun otro archivo no entra solo en un commit.* El
codigo entra porque compila y rompe algo si falta; un `.sql` de politicas no rompe nada al
faltar — hasta el dia que hay que desplegar en otra maquina. **Dos meses en los que perder
este portatil habria costado el aislamiento multi-tenant de la base de datos.**

## 2. El aislamiento real de la base llego **dos meses despues** de los arreglos que decian aislarla

**Que paso.** El 15 de junio se cerraron cinco hallazgos criticos de fuga entre
organizaciones: gateways sin auth y servicios de IA sin filtro de `organizationId`. Todos se
arreglaron **en el codigo de la aplicacion**. La ultima linea de defensa —que la propia base
de datos rechace una consulta sin filtro— no llego hasta el 17 de agosto.

**Causa.** El diseno de mayo declaro RLS como «estrategia conceptual» y el trabajo de junio
lo leyo como «ya cubierto por los guards».

**Leccion.** *Arreglar todas las llamadas no es lo mismo que hacer imposible la llamada mala.*
Es `D6` aplicada a los datos: *un orden critico se hace imposible de invertir, no se
advierte*. Entre junio y agosto, el aislamiento dependia de que **cada consulta futura** se
acordara del `where` — y eso es una promesa, no una garantia.

## 3. Se subieron los archivos, no se comprobo que sirvieran

**Que paso.** Las politicas RLS entraron a git. **No hay constancia de que se aplicaran a
ninguna base ni de que se probara que funcionan.** Al conectar a la base el 2026-09-04,
seguian sin aplicarse dos migraciones — y de las politicas RLS no se verifico nada.

**Causa.** El objetivo del dia era *poner a salvo*, no *poner en marcha*. Legitimo, pero el
commit se lee como si la funcionalidad existiera.

**Leccion.** *«Versionado» y «funcionando» son dos estados distintos, y el mensaje de un
commit no los distingue.* `Politicas RLS de Postgres` suena a que la base esta aislada. Lo que
significa de verdad es que el archivo que la aislaria esta guardado.
