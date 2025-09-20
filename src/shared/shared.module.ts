import { Global, Module } from '@nestjs/common'
import { PrismaService } from './services/prisma.service'
import { HashingService } from './services/hashing.service'
import { TokenService } from './services/token.service'
import { JwtModule } from '@nestjs/jwt'
import { AccessTokenGuard } from './guards/access-token.guard'
import { ApiKeyGuard } from './guards/api-key.guard'
import { APP_GUARD } from '@nestjs/core'
import { AuthenticationGuard } from './guards/authentication.guard'
import { createMulterOptions } from './utils/multer.util'
import { ConfigModule, ConfigService } from '@nestjs/config'
import { MulterModule } from '@nestjs/platform-express'
const sharedServices = [PrismaService, HashingService, TokenService]

@Global()
@Module({
  providers: [
    ...sharedServices,
    AccessTokenGuard,
    ApiKeyGuard,
    {
      provide: APP_GUARD,
      useClass: AuthenticationGuard,
    },
  ],
  exports: [...sharedServices, MulterModule],
  imports: [
    JwtModule,
    ConfigModule,
    MulterModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => createMulterOptions(config),
    }),
  ],
})
export class SharedModule {}
