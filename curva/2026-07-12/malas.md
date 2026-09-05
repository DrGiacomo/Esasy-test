# Malas — 2026-07-12 · Easy Test

> **Reconstruida el 2026-09-04**, no escrita ese dia. No existian transcripts de chat de
> mayo a julio —las carpetas de sesion estan vacias—, asi que esto sale de `git log`, de
> `Docs/audit-2026-07-12.md` y 4 commits. Cada entrada dice de donde. **Lo que no consta en una fuente, no esta aqui.**

---

## 1. Veinticuatro hallazgos nuevos sobre un producto declarado «al 90 % de produccion»

**Que paso.** Catorce dias despues de escribir *«Producto grado produccion ~90 %»*, una
auditoria encontro **5 criticos, 5 altos, 7 medios y 7 bajos**. Entre los criticos, una fuga
que exponia el DOM completo de las paginas de clientes a cualquiera con la URL.

**Causa.** El «90 %» se calculo contra la lista de pendientes conocidos, no contra lo que el
producto necesita. Lo desconocido no estaba en el denominador — y era donde vivia todo.

**Leccion.** *Cuando un porcentaje de avance y una auditoria posterior se contradicen, el que
esta mal es el porcentaje.* Y el patron se repite: **la primera auditoria encontro 28 y la
segunda 24 sobre codigo ya auditado**. Un informe de auditoria no reduce la deuda futura; solo
la del dia que se corrio.

## 2. Diecisiete hallazgos cerrados en tres commits, el mismo dia, sin correr el flujo en vivo

**Que paso.** Tres commits seguidos cerraron criticos, altos y medios. Se paso la suite
(83/83) y se compilo. **No se volvio a ejecutar el flujo completo con Docker**, como si se
habia hecho el 06-27.

**Causa.** La suite en verde se leyo como verificacion suficiente. **Es la misma causa que el
06-15**, y el 06-15 ya habia demostrado que no basta: aquel dia tambien paso la suite, y dejo
el flujo de grabacion muerto doce dias.

**Leccion.** **Segunda vez.** *Una leccion escrita no es una leccion aprendida.* No hay
constancia de que el flujo en vivo se corriera despues del 07-12 — hasta el 2026-09-04, casi
dos meses. Lo que se descubrio ese dia al arrancarlo: dos migraciones sin aplicar, y un
choque de puertos que impedia conectar.

## 3. Los 7 bajos se quedaron abiertos 54 dias

**Que paso.** Bien listados, bien descritos, y sin tocar desde el 12 de julio hasta el 4 de
septiembre. Entre ellos, `'24h'` interpretado como **24 dias** en la caducidad del refresh
token.

**Causa.** «Bajo» se leyo como «no urgente», y no habia nada que los volviera a poner
delante.

**Leccion.** *Una lista de pendientes sin fecha de revision es un archivo, no una lista.*
Cerrarlos costo, contado el 2026-09-04, **menos de una hora los siete**. Cincuenta y cuatro
dias abiertos por un trabajo de una hora: lo que faltaba no era tiempo, era volver a mirar.

## 4. Se anoto deuda operativa nueva y se sumo a la que ya habia

**Que paso.** El informe cierra pidiendo aplicar la migracion `20260712170000_refresh_token_org`
y reconstruir la imagen del executor. Se suma a los dos avisos identicos del 06-28.

**Causa.** El aviso escrito no ejecuta nada, y nada del cierre obligaba a hacerlo.

**Leccion.** *Un aviso repetido es un mecanismo que falta.* Se comprobo el 2026-09-04: **la
migracion seguia sin aplicar 54 dias despues**, y las imagenes siguen sin reconstruir hoy. El
tercer aviso no habria funcionado mejor que los dos primeros; lo que hacia falta era que el
arranque las aplicara solo — que es lo que hace ahora `arrancar.bat`.
