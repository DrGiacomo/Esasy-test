# Solo Chromium. La imagen oficial de Playwright trae ademas Firefox y WebKit -unos 2,9 GB-
# y este contenedor solo usa `chromium` (`src/executor.js`). Partiendo de node:20-slim e
# instalando un unico navegador la imagen baja a la mitad, y eso es la mitad de descarga la
# primera vez que alguien instala Easy Test, que es donde la gente abandona.
#
# `--with-deps` instala las librerias del sistema que Chromium necesita (fuentes, codecs,
# X11). Sin ellas la imagen construye igual y falla al RENDERIZAR, que es peor.
#
# La version del navegador la fija el paquete `playwright` del package.json: por eso se
# instala DESPUES de `npm install`, no antes. Si se cambia la version ahi, esta imagen se
# reconstruye sola con la que toque.
FROM node:20-slim

WORKDIR /app

COPY package*.json ./
RUN npm install --production

RUN npx playwright install --with-deps chromium

COPY src/ ./src/


ENV EXECUTION_ID=""
ENV PROJECT_ID=""
ENV ORG_ID=""
ENV REDIS_URL=""
ENV DATABASE_URL=""

CMD ["node", "src/executor.js"]
