FROM mcr.microsoft.com/playwright:v1.48.0-jammy

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY src/ ./src/

ENV SESSION_ID=""
ENV TARGET_URL=""
ENV BACKEND_WS_URL="ws://backend:3000"

CMD ["node", "src/recorder.js"]
