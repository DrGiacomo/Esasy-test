# Buenas — 2026-09-06 · Easy Test

> Continuación de la jornada del `2026-09-05`, que se alargó pasada la medianoche. Lo de este
> archivo salió todo de **una captura de pantalla del usuario**: una grabación real de
> `www.frivclassic.com` que falló.

---

## 1. Las descripciones dejaron de escupir selectores

La grabación real producía pasos que decían **«Pulsar #flashObject»**. Para el perfil que no
programa —que es el motivo por el que existe el producto— eso no significa nada, y viola `P3`
de la biblia escrita el día anterior.

Ahora el selector se traduce, y el técnico **no se pierde**: sigue en su columna y la pantalla
lo enseña en «ver detalle técnico».

| Antes | Ahora |
|---|---|
| `Pulsar #flashObject` | **Pulsar el elemento «flash object»** |
| `Pulsar #playButton` | **Pulsar el elemento «play button»** |
| `Pulsar [name="email"]` | **Pulsar el campo «email»** |
| `Pulsar div > .x:nth-child(3)` | **Pulsar el elemento** *(no sabe traducirlo y no lo enseña)* |

**La regla que se fijó, y es la que importa:** el último recurso ya **no** es el selector. Si no
se puede traducir, se dice «el elemento». Con un test que lo comprueba: *«nunca deja pasar un
selector crudo, aunque no sepa traducirlo»*.

## 2. El error dejó de ser una traza de Playwright en inglés

Lo que el usuario vio en su captura:

```
TimeoutError: page.click: Timeout 30000ms exceeded.
Call log: - waiting for locator('#flashObject')
```

Lo que lee ahora:

> **El paso «Pulsar el elemento «flash object»» no se pudo hacer:** el elemento no apareció en
> la página después de 30 segundos. Puede que haya cambiado, que tarde más en aparecer, o que
> la página anterior no llegara a cargar.

Y el texto técnico **se sigue guardando entero** en el paso. No se sustituye información: se
decide cuál se lee primero.

**Lo que NO hace, y es a propósito:** un error que no sabe traducir lo devuelve tal cual.
Inventar una explicación plausible sería peor que enseñar la técnica — `P5`.

## 3. Los 30 segundos dejaron de estar escondidos

El `Timeout 30000ms` de la captura **no salía de ninguna línea del código**: era el valor por
defecto de Playwright. Buscar «30000» en el proyecto no lo encontraba.

Ahora hay una sola constante (`STEP_TIMEOUT_MS`), atada con `context.setDefaultTimeout()`, que
gobierna todas las acciones y se puede cambiar desde el compose sin reconstruir nada. Se probó
bajándola a 5 s: el mensaje dice «después de 5 segundos» y el fallo llega seis veces antes.

> **Y un dato que salió solo:** con la espera en 5 s falló un paso que con 30 s pasaba —
> pulsar `#flashObject` tardaba **5,8 s** en resolverse. El tiempo de espera no es un ajuste
> cosmético: decide qué pruebas pasan.

---

## 4. La identidad entró en el producto: «Sangre y Oro»

De cuatro maquetas a la aplicación funcionando, en una jornada. Lo que lo hizo posible no fue
pintar rápido: fue **poner los colores en un solo sitio antes de tocar nada**.

| | |
|---|---|
| Antes | 40 grises, 21 índigos y 24 blancos escritos a mano en decenas de archivos |
| Y además | `tailwind.config.ts` definía una paleta `brand` que **no se aplicaba a nada** — Tailwind v4 lee el CSS e ignora ese archivo, y nadie usaba `brand-` |
| Ahora | Todo el color en `index.css`, con nombres que dicen **para qué** sirven |
| Barrido | **44 archivos** convertidos de una vez |

**La decisión de fondo, y es la que más va a durar:** los colores de estado (`paso`, `fallo`,
`espera`) están **separados de los de marca**. El rojo de la marca está en el botón de *Entrar*;
el rojo de *Falló* es un dato que se lee de dos metros. Si compartieran color, «Entrar» y
«Falló» se verían igual — y el día que cambie la marca, cambiaría el significado de la pantalla.

## 5. El contraste se midió, no se miró

Al convertir los grises salió que el texto secundario quedaba en **2,24:1**, cuando el mínimo
legible es 4,5:1. Y al medir el gris anterior: **2,54:1 — ya estaba mal desde antes**.

Se ajustaron dos tonos de la paleta hasta que cumplieron (`5,04:1`) y se subió el texto
secundario en 20 archivos. **Ninguno de los dos números salió de mirar la pantalla: salieron de
calcular la fórmula de contraste.** Un color que «se ve bien» a las once de la noche en un
monitor bueno no es un dato.

En el tema oscuro se midió antes de escribirlo: texto `15,1:1`, secundario `7,7:1`, dorado
`7,6:1`.

## 6. Trece cortinas de entrada, y ninguna se tiró

Cuatro tandas de maquetas hasta dar con lo que el autor buscaba. **Todas quedaron guardadas** en
`C:\Proyectos\Animaciones\`, junto con el vocabulario completo de Alma extraído de su código.

Y el valor apareció donde no se buscaba: **dos de las descartadas encontraron trabajo**. Fue
idea del autor —«Bandas para pasar entre vistas, Enfoque para cuando se convierte un vídeo»— y
cambia lo que es esa carpeta: no son cortinas para elegir una y tirar doce, es **un repertorio
de gestos que se reparten por la aplicación**. Bandas ya está puesto entre vistas.

## 7. El grabador dejó de frenar la página que graba

El usuario reportó que grabar un juego iba a tirones. No era el juego:

```js
setInterval(() => page.screenshot(...), 200)   // 5 capturas por segundo
```

**`page.screenshot()` pausa el renderizado del navegador para capturar.** En una página quieta no
se nota; en un juego que redibuja sesenta veces por segundo, cada captura le roba el turno.
**Lo estábamos frenando nosotros.**

Ahora usa `Page.startScreencast`: el navegador empuja el fotograma cuando algo cambia, sin
pausar nada. **De 5 a ~30 por segundo, y sin frenar la página.** Con vuelta atrás al método
viejo si el screencast no está disponible: peor, pero grabar sigue funcionando.

## 8. El diagrama del flujo: el de Alma, pero contando

Seis nodos con flechas, transiciones escritas y el ciclo de vuelta a trazos. Dos diferencias con
el original:

1. **Lee la base.** Cada nodo dice cuántas cosas hay paradas ahí ahora mismo. Un diagrama sin
   números se mira una vez; con números se mira todos los días.
2. **El color del borde dice quién** hace avanzar cada paso. Es la otra mitad de la pregunta:
   qué está en qué estado, y de quién depende que se mueva.

Sin librería: son seis nodos y sus posiciones no cambian. Una librería de diagramas habría
costado entre 90 y 300 KB por un motor de colocación automática que aquí no hace nada.
