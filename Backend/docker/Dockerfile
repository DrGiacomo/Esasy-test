FROM node:20-alpine AS builder
WORKDIR /app

# Prisma lo necesita para elegir su motor. Alpine no trae openssl y Prisma, en vez de
# fallar claro, avisa en un warning y revienta despues aplicando migraciones.
RUN apk add --no-cache openssl

COPY package*.json ./
RUN npm ci

COPY . .
RUN npx prisma generate && npm run build

# ──────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

# Tambien aqui: el motor de Prisma se carga en tiempo de EJECUCION, no solo al construir.
RUN apk add --no-cache openssl

# Copiar node_modules completo del builder (incluye Prisma client generado)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist
COPY prisma ./prisma
# package.json va tambien, y no es de adorno: `npx prisma db seed` lee de el la clave
# "prisma.seed" para saber que ejecutar. Sin este archivo, sembrar los datos de ejemplo
# desde el contenedor falla con un mensaje que no menciona la causa.
COPY package.json ./package.json
COPY tsconfig.json ./tsconfig.json
COPY docker/entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
