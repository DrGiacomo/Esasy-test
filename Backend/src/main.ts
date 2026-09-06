import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Los artefactos NO se sirven como estáticos (los estáticos esquivan el JwtAuthGuard):
  // los sirve ArtifactsController con auth + verificación de org, fuera del prefijo
  // para preservar las URLs `/artifacts/...` ya almacenadas en la BD.
  app.setGlobalPrefix('api/v1', {
    exclude: ['artifacts/:executionId/:filename'],
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  app.enableCors({
    origin: process.env.NODE_ENV === 'production' ? false : '*',
    credentials: true,
  });

  const port = process.env.PORT ?? 3000;
  // Cierre ordenado: sin esto Docker espera diez segundos, no obtiene respuesta y mata el
  // proceso (codigo 137), cortando en seco lo que estuviera atendiendo. El worker ya lo
  // hacia (`bootstrap-worker.ts`); esto es la misma linea que faltaba aqui.
  app.enableShutdownHooks();

  await app.listen(port);
  console.log(`Backend running on http://localhost:${port}/api/v1`);
}

bootstrap().catch((err) => {
  console.error('El backend no pudo arrancar:', err);
  process.exit(1);
});
