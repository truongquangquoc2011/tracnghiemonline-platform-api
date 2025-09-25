import { INestApplication } from '@nestjs/common'
import { SwaggerModule } from '@nestjs/swagger'
import { swaggerConfig } from './swagger.config'
import expressBasicAuth from 'express-basic-auth'
import { envConfig } from '../config'

export function setupSwagger(app: INestApplication) {
  const username = envConfig.swaggerUsername
  const password = envConfig.swaggerPassword
  app.use(
    ['/docs', '/docs-json'],
    expressBasicAuth({
      challenge: true,
      users: { [username]: password },
    }),
  )

  const document = SwaggerModule.createDocument(app, swaggerConfig)

  SwaggerModule.setup('docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  })
}
