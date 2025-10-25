import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger } from '@nestjs/common';
import { setupSwagger } from './shared/swagger/swagger';
import { NestExpressApplication } from '@nestjs/platform-express';
import helmet from 'helmet';
import { envConfig } from './shared/config';
import { ParseObjectIdPipe } from './shared/pipes/parse-objectid.pipe';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Giữ nguyên hành vi hiện tại
  app.set('trust proxy', 'loopback');

  // Nếu có CORS_ORIGIN thì dùng whitelist; nếu không có -> giữ nguyên enableCors() như cũ
  if (process.env.CORS_ORIGIN) {
    app.enableCors({
      origin: [process.env.CORS_ORIGIN],
      credentials: true,
    });
  } else {
    app.enableCors();
  }

  // Helmet như cũ; nếu Swagger bị chặn asset, có thể bật CSP=false (tùy chọn)
  app.use(
    helmet(
      // { contentSecurityPolicy: false } // <- chỉ bật nếu /docs không load CSS/JS
    ),
  );

  // Giữ nguyên prefix đúng như bạn đang dùng (có leading slash để "không ảnh hưởng gì")
  app.setGlobalPrefix('/api/v1');

  // Giữ nguyên vị trí gọi setupSwagger theo code của bạn
  setupSwagger(app);

  // Global pipes giữ nguyên
  app.useGlobalPipes(new ParseObjectIdPipe());

  // Graceful shutdown giữ nguyên
  app.enableShutdownHooks();
  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down successfully');
    app.close().then(() => console.log('NestJS app closed'));
  });
  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down successfully');
    app.close().then(() => console.log('NestJS app closed'));
  });

  // Start server:
  // - Ưu tiên PORT từ ENV (Railway/Render sẽ truyền vào)
  // - Fallback sang envConfig như hiện tại
  const port =
    Number(process.env.PORT) ??
    (envConfig.port as number) ??
    (envConfig.portDefault as number) ??
    8080;

  // Bind '0.0.0.0' để nhận traffic từ ngoài (cần cho Railway/Render)
  await app.listen(port, '0.0.0.0');

  Logger.log(` Server is running on: ${await app.getUrl()}`);
  Logger.log(` Swagger is available at: ${await app.getUrl()}/docs`);
}

void (async (): Promise<void> => {
  try {
    await bootstrap();
  } catch (error) {
    Logger.error(error, 'Error starting server');
  }
})();
