import { Module } from '@nestjs/common'
import { AuthService } from './auth.service'
import { AuthController } from './auth.controller'
import { RolesService } from './role.service'
import { AuthRepository } from './auth.repo'
import { FacebookService } from './facebook.service'
import { EmailService } from 'src/shared/services/email.service'
import { CloudinaryService } from 'src/shared/services/cloudinary.service'

@Module({
  controllers: [AuthController],
  providers: [AuthService, RolesService, AuthRepository, FacebookService, EmailService,CloudinaryService],
  exports: [AuthRepository],
})
export class AuthModule {}
