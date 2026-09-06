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
