import { NestFactory } from '@nestjs/core';
import { WorkerModule } from './worker.module';

async function bootstrap() {
  // Proceso standalone — sin HTTP server, solo BullMQ workers
  const app = await NestFactory.createApplicationContext(WorkerModule);
  app.enableShutdownHooks();
  console.log('Worker process running');
}

bootstrap().catch((err) => {
  console.error('El worker no pudo arrancar:', err);
  process.exit(1);
});
