# Buenas — 2026-09-05 · Easy Test

---

## 1. Las trazas dejaron de ser una promesa

Se reconstruyeron las imágenes de executor y recorder —eran de junio— y se lanzó **una
ejecución real**. Resultado, con los archivos en el disco para demostrarlo:

| | |
|---|---|
| Duración | 52 s (`PROVISIONING → RUNNING → COMPLETED`) |
| Traza generada | `395b9f50….zip`, **41,7 KB** |
| `traceUrl` en la base | deja de ser `null` |
| Paso fallido | **30.099 ms**, no `0` |

Los dos últimos cierran de verdad el entregable `4.3` y el hallazgo BAJO nº1, que hasta
ayer estaban escritos y sin ver funcionar. **Setenta días de aviso repetido, resueltos con
un comando.**

## 2. El lint pasó de 530 problemas a 0, atacando la causa

La documentación decía «~444 errores CRLF/prettier». Al medirlos eran **530, y 80 no eran
de formato** — eso no constaba en ninguna parte.

Lo que lo desbloqueó no fue reformatear: fue **declarar el final de línea del proyecto**
(`.gitattributes`). Sin eso, cada reformateo dura hasta el siguiente commit desde otra
máquina.

## 3. Un bug real escondido detrás de un aviso de estilo

`vault.service` descifraba un secreto con `decipher.update(buf) + decipher.final('utf8')`:
un `Buffer` concatenado con un `string`, que fuerza un `toString()` sin encoding declarado.

Hoy funciona porque GCM procesa todo de una vez. **Basta un carácter multibyte en la
frontera para que el secreto salga corrupto** — y un secreto corrupto no da error: da un
fallo de autenticación inexplicable en el sistema del cliente.

**Lo encontró el lint, no una auditoría.** Estaba entre los 80 «errores de estilo» que
llevaban tres meses sin mirarse.

## 4. Los selectores sin tipar, cerrados donde nacen

`axios.post` sin tipo devuelve `any`, y con `any` TypeScript deja de comprobar **todo** lo
que cuelga. Eran 26 avisos en cuatro archivos: DeepSeek (8), Gemini (14), GitHub (4).

Se declaró la forma de cada respuesta. Es exactamente el patrón que la auditoría del
`2026-06-15` marcó como **dominante** —«parsing/validación frágil de respuestas de
DeepSeek»— y que se había cerrado a medias: se validaba el contenido, pero el compilador
seguía ciego.

## 5. Tres capturas huérfanas, abiertas y con pie de foto

Llevaban desde mayo en `Docs/` sin que ningún documento las mencionara. Se abrieron:

- Una documenta las **cuatro imágenes del proyecto y su tamaño** (2,91 GB cada contenedor
  de Playwright) — explica por qué reconstruirlas tarda y por qué nadie lo hacía.
- Otra enseña el stack corriendo, y de paso **dos contenedores `postgres` sueltos** que
  nadie sabe de dónde salieron.
- La tercera **no es de este proyecto**: son contenedores de `sustainablestart`.

De 5 archivos huérfanos a 2, y los 2 que quedan son configuración, no documentación.

## 6. Se comprobó que el gate funciona antes de darlo por puesto

`lint:ci` sin `--fix` y con `--max-warnings=0` en los dos lados, ejecutado: **código de
salida 0**. Un gate que no se ha visto pasar ni fallar no es un gate, es una intención.

## 7. Los dos entregables que dejó a medias el apagón, cerrados y ejecutados

El corte de luz dejó `5.2` (secretos que se generan solos) y `5.3` (la IA como opcional)
escritos y **sin commit, sin compilar y sin ejecutar**. Hoy se verificaron **ejecutando**:

| | |
|---|---|
| Backend sin `DEEPSEEK_API_KEY` | Arranca: `Nest application successfully started` |
| Aviso en el log | `WARN [DeepSeekProvider] Sin DEEPSEEK_API_KEY: las funciones de IA quedan desactivadas` |
| `GET /ai/estado` | `{"disponible":false,"motivo":"Falta DEEPSEEK_API_KEY…"}` |
| Las **5** operaciones de IA | `503` las cinco, con mensaje para una persona |

**Por qué cuenta:** ayer se aprendió que *un `npm run build` que pasa no dice que el proyecto
arranque* (`I5`). Hoy no se dio por bueno nada por compilar: se levantó Postgres, se hizo
login con el usuario del seed y se llamó a las cinco operaciones **una por una**.

## 8. El script de secretos se probó donde no podía hacer daño

`preparar-entorno.mjs` puede regenerar `VAULT_ENCRYPTION_KEY`, y esa clave cifra los secretos
de cada organización: **regenerarla no los invalida, los deja ilegibles para siempre y sin
ningún error**. Probarlo sobre el `.env` real era la forma barata de destruir datos del
proyecto de otra persona (`D4`).

Se copió el árbol mínimo al *scratchpad* y se probaron **tres casos**, incluido el peligroso:

| Caso | Resultado |
|---|---|
| Sin `.env` | Lo crea y genera los 2 secretos (64 hex cada uno) |
| Segunda pasada | `diff`: **byte a byte idéntico** |
| `.env` a medias | Rellena el que falta, **no toca el que ya estaba** |

## 9. La deuda operativa caducada del `PENDIENTES` se corrigió al pasar por delante

El final del documento seguía pidiendo **reconstruir las imágenes** (hecho ayer), **aplicar
migraciones** (hechas el 09-04) y avisando de **«~444 errores de lint»** (eran 530 y quedaron
en 0 ayer). Tres avisos vivos que ya no eran verdad.

Es la fila de `LECCIONES.md §1` con **ocho** repeticiones —*el documento que dice dónde
estamos miente*—. No se ha esperado a que alguien tropiece con ella otra vez.
