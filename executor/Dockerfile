FROM mcr.microsoft.com/playwright:v1.48.0-jammy

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY src/ ./src/

ENV EXECUTION_ID=""
ENV PROJECT_ID=""
ENV ORG_ID=""
ENV REDIS_URL=""
ENV DATABASE_URL=""

CMD ["node", "src/executor.js"]
