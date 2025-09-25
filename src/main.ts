import { NestFactory } from '@nestjs/core'
import { AppModule } from './app.module'
import { Logger } from '@nestjs/common'
import { setupSwagger } from './shared/swagger/swagger'
import { NestExpressApplication } from '@nestjs/platform-express'
import helmet from 'helmet'
import { envConfig } from './shared/config'
import { ParseObjectIdPipe } from './shared/pipes/parse-objectid.pipe'

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule)
  app.set('trust proxy', 'loopback')
  app.enableCors()
  app.use(helmet())
  app.setGlobalPrefix('/api/v1')

  app.enableShutdownHooks()
  app.useGlobalPipes(new ParseObjectIdPipe());

  process.on('SIGTERM', () => {
    console.log('Received SIGTERM, shutting down successfully')
    app.close().then(() => {
      console.log('NestJS app closed')
    })
  })

  process.on('SIGINT', () => {
    console.log('Received SIGINT, shutting down successfully')
    app.close().then(() => {
      console.log('NestJS app closed')
    })
  })

  setupSwagger(app)
  await app.listen(envConfig.port ?? envConfig.portDefault)
  Logger.log(`🚀 Server is running on: ${await app.getUrl()}`)
}

void (async (): Promise<void> => {
  try {
    await bootstrap()
  } catch (error) {
    Logger.error(error, 'Error starting server')
  }
})()
