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

# Las dos van VACIAS a proposito, y esto no es un descuido:
#   VITE_API_URL   vacia -> el cliente pide a `/api/v1`, misma direccion que la pagina,
#                           y nginx lo reenvia al backend. Sin CORS y sin puertos a mano.
#   VITE_WS_URL    vacia -> socket.io se conecta al mismo origen, y nginx lo reenvia.
# Si se pusieran a `http://localhost:3000`, la imagen solo serviria en la maquina de quien
# la construyo: en cualquier otra, el navegador buscaria el backend en SU propio localhost.
ENV VITE_API_URL=""
ENV VITE_WS_URL=""
RUN npm run build

# ── 2. Servir ────────────────────────────────────────────────────────────────
FROM nginx:1.27-alpine AS runner

COPY --from=builder /app/dist /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
