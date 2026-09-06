# Pantalla de Easy Test, compilada y servida por nginx.
#
# Por que nginx y no `npm run dev` dentro de un contenedor: el fin de la Fase 5 es que
# alguien que no programa llegue a la pantalla de acceso sin abrir una terminal. Un
# servidor de desarrollo pesa ~500 MB, necesita las dependencias enteras y esta pensado
# para que un programador toque archivos. Esto pesa ~60 MB y solo sirve archivos.
#
# Para trabajar en el codigo del frontend se sigue usando `npm run dev` en local, o el
# override de desarrollo. Este Dockerfile es el de entregar.

# ── 1. Compilar ──────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

# Las dos son RELATIVAS a proposito: la pagina pide a su propia direccion y nginx lo
# reenvia al backend. Sin CORS y sin puertos escritos a mano. Si se pusieran a
# `http://localhost:3000`, la imagen solo serviria en la maquina de quien la construyo:
# en cualquier otra, el navegador buscaria el backend en SU propio localhost.
#
#   VITE_API_URL debe llevar la ruta ENTERA, no ir vacia. El cliente hace
#       import.meta.env.VITE_API_URL ?? '/api/v1'
#   y `??` solo salta cuando el valor es NULO: una cadena vacia le vale, asi que con ""
#   el prefijo /api/v1 desaparecia y la aplicacion pedia a /auth/login. nginx lo tomaba
#   por una ruta de la pagina y respondia 405 a los POST. Verificado el 2026-09-05: con
#   curl a mano parecia funcionar, porque curl no usa esta variable.
ENV VITE_API_URL="/api/v1"
# Esta si va vacia: el cliente hace `${WS_URL}${namespace}`, y con "" queda
# "/executions", que socket.io resuelve contra el mismo origen. Es lo que se busca.
ENV VITE_WS_URL=""
RUN npm run build

# ── 2. Servir ────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
