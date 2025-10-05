import { DocumentBuilder } from '@nestjs/swagger'

export const swaggerConfig = new DocumentBuilder()
  .setTitle('Beamin API')
  .setDescription('An advanced NestJS backend')
  .setVersion('1.0')
  .addBearerAuth(
    {
      type: 'http',
      scheme: 'bearer',
      bearerFormat: 'JWT',
      in: 'header',
    },
    'authorization',
  )
  .addApiKey(
    {
      type: 'apiKey',
      in: 'header',
      name: 'X-Api-Key',
      description: 'Enter your API key to access this endpoint',
    },
    'X-Api-Key',
  )
  .build()
