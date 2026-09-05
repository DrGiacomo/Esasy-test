# Qué muestra cada captura

> **Por qué existe este archivo.** En `Docs/` había tres capturas de pantalla de mayo con
> nombres como `Captura de pantalla 2026-05-27 212037.png`. **Ningún documento las
> mencionaba**, así que nadie sabía qué enseñaban ni por qué estaban ahí: 399 KB de
> documentación que no documentaba nada. Se abrieron el `2026-09-05` y aquí está lo que
> hay dentro.
>
> Una imagen sin pie de foto no es documentación: es un archivo. Y un archivo que nadie
> cita se borra al primer limpiado, con lo que tuviera dentro.

---

## `Captura de pantalla 2026-05-27 212037.png` — las imágenes que construye el proyecto

**Docker Desktop → Images, el 27 de mayo a las 21:20.** Es la más útil de las tres: enseña
las cuatro imágenes de Easy Test recién construidas, con su tamaño real.

| Imagen | Tamaño |
|---|---|
| `e2e-platform/executor:latest` | 2,91 GB |
| `e2e-platform/recorder:latest` | 2,91 GB |
| `easytest-backend:latest` | 901 MB |
| `easytest-worker:latest` | 901 MB |

Más la infraestructura: `postgres:16-alpine` (396 MB) y `redis:7-alpine` (58 MB).

**Por qué importa hoy:** los 2,91 GB de executor y recorder son casi todo Playwright con sus
navegadores. Explica por qué reconstruirlas tarda varios minutos —el paso que
`Docs/COMO-PROBAR.md` pide en su punto 6— y por qué nadie las reconstruía por costumbre.
Verificado el `2026-09-05` al reconstruirlas: siguen pesando **2,91 GB cada una**, idéntico
a mayo.

## `Captura de pantalla 2026-05-27 211949.png` — el stack corriendo

**Docker Desktop → Containers, el mismo día, un minuto antes.** El grupo `easytest`
levantado, consumiendo 0,34 % de CPU y 39 MB.

Dos detalles que se ven y conviene saber:

- Junto a Easy Test corre el stack de **otro proyecto** (`sustainablestar`). Es el mismo
  solapamiento que el `2026-09-04` provocó el choque de puertos con PostgreSQL: en esta
  máquina, Easy Test nunca ha estado solo.
- Hay **dos contenedores `postgres` sueltos** con nombres generados
  (`blissful_murdoc`, `hungry_mirzakh`), fuera de cualquier `docker compose`. Nadie sabe de
  dónde salieron.

## `Captura de pantalla 2026-05-25 222035.png` — ⚠️ no es de este proyecto

**No hay ni un contenedor de Easy Test en ella.** Es un recorte de Docker Desktop con
`ss_backend`, `ss_phpmyadmin`, `ss_db` (MySQL) y `ss_mailpit`: todos del proyecto
**sustainablestart**. Easy Test no usa MySQL, ni phpMyAdmin, ni Mailpit.

Lleva en `Docs/` desde el 25 de mayo, el día del primer commit. **Se deja donde está y no se
borra por cuenta propia** —los archivos de alguien no son variables—, pero queda dicho: es
la documentación de otro proyecto guardada en este.

---

## La regla que sale de aquí

*Una captura se pega en el documento que la necesita, o no se guarda.* Suelta en una carpeta,
con el nombre que le puso el sistema operativo, dura exactamente hasta que alguien se olvida
de qué mostraba — y eso tardó **tres meses y diez días**.
