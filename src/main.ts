import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, RequestMethod } from '@nestjs/common';
import { setupSwagger } from './shared/swagger/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { ParseObjectIdPipe } from './shared/pipes/parse-objectid.pipe';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  app.set('trust proxy', 'loopback');
  app.enableCors();
  app.use(
    helmet({
      // Swagger UI có thể bị chặn bởi CSP trong dev
      contentSecurityPolicy:
        process.env.NODE_ENV === 'production' ? undefined : false,
    }),
  );

  // Đặt global prefix nhưng loại trừ /docs và tài nguyên của Swagger
  app.setGlobalPrefix('api/v1', {
    exclude: [
      { path: 'docs', method: RequestMethod.ALL },
      { path: 'docs-json', method: RequestMethod.ALL },
      { path: 'docs/*path', method: RequestMethod.ALL }, // ✅ path-to-regexp v6
    ],
  });

  // Swagger ở /docs
  setupSwagger(app);

  // Global pipes
  app.useGlobalPipes(new ParseObjectIdPipe());

  // Graceful shutdown
  app.enableShutdownHooks();
  process.on('SIGTERM', () =>
    app.close().then(() => console.log('NestJS app closed')),
  );
  process.on('SIGINT', () =>
    app.close().then(() => console.log('NestJS app closed')),
  );

  // Start server (Railway cấp PORT)
  await app.listen(
    process.env.PORT ? Number(process.env.PORT) : 8080,
    '0.0.0.0',
  );
  Logger.log(`Server is running on: ${await app.getUrl()}`);
  Logger.log(`Swagger is available at: ${await app.getUrl()}/docs`);
}

bootstrap().catch((error) => Logger.error(error, 'Error starting server'));
