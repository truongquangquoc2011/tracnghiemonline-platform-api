import { Global, Module } from '@nestjs/common'
import { ConfigModule } from '@nestjs/config'
import { PrismaService } from './services/prisma.service'


@Global()
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      expandVariables: true,
      envFilePath: ['.env'],
    }),
  ],
  providers: [PrismaService],
  exports: [PrismaService],
})
export class SharedModule {}
