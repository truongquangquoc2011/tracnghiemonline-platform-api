import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  Get,
  Ip,
  Inject,
  Query,
  Res,
  Patch,
  UseInterceptors,
  UploadedFile,
  Req
} from '@nestjs/common'
import { AuthService } from './auth.service'
import { Auth, IsPublic } from 'src/shared/decorator/auth.decorator'
import { AuthTypes, ConditionGuard } from 'src/shared/constants/auth.constant'
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger'
import { MESSAGES } from 'src/shared/constants/message.constant'
import {
  badRequestResponse,
  internalServerErrorResponse,
  notFoundResponse,
  unauthorizedResponse,
  userAuthResponse,
} from 'src/shared/swagger/swagger.util'
import { ActiveUser } from 'src/shared/decorator/active-user.decorator'
import { SkipThrottle } from '@nestjs/throttler'
import {
  ForgotPasswordBodyDTO,
  LoginBodyDTO,
  LogoutBodyDTO,
  RefreshTokenDTO,
  RegisterBodyDTO,
  SendOTPBodyDTO,
  UpdateUserProfileDTO,
} from './dto/auth.dto'
import { DeviceId } from 'src/shared/decorator/user-agent.decorator'
import { FacebookService } from './facebook.service'
import { envConfig } from 'src/shared/config'
import { handleOAuthCallback } from 'src/shared/helper/oauth.helper'
import { AuthError } from 'src/shared/constants/auth-error.enum'
import { Response } from 'express'
import { FileInterceptor } from '@nestjs/platform-express'
import { NoFileProvidedException } from 'src/shared/constants/file-error.constant'
import { CloudinaryService } from 'src/shared/services/cloudinary.service'
import { UpdateAvatarResType } from './auth.model'
import { GoogleService } from './google.service';

@Controller('auth')
@ApiTags('Auth')
@SkipThrottle({ short: true, long: true })
export class AuthController {
  private readonly facebookRedirectBase: URL;
  private readonly googleRedirectBase: URL;
  
  constructor(
    private readonly authService: AuthService,
    @Inject(FacebookService) private readonly facebookService: FacebookService,
    private readonly cloudinaryService: CloudinaryService,
    private readonly googleService: GoogleService,
  ) {
    this.facebookRedirectBase = new URL(envConfig.facebookClientRedirectUri)
    this.googleRedirectBase = new URL(envConfig.googleClientRedirectUri);
  }

  @SkipThrottle({ short: false, long: false })
  @Post('register')
  @ApiOperation({ summary: MESSAGES.API_MESSAGES.AUTH.REGISTER.MESSAGE_TITLE })
  @ApiOperation({
    summary: MESSAGES.API_MESSAGES.AUTH.REGISTER.MESSAGE_SUMARY,
  })
  @ApiResponse(userAuthResponse(MESSAGES.SUCCESS_MESSAGES.REGISTER))
  @ApiResponse(unauthorizedResponse())
  @ApiResponse(badRequestResponse())
  @ApiResponse(internalServerErrorResponse())
  async register(@Body() body: RegisterBodyDTO) {
    return await this.authService.register(body)
  }

  @SkipThrottle({ short: false, long: false })
  @Post('login')
  @ApiOperation({
    summary: MESSAGES.API_MESSAGES.AUTH.LOGIN.MESSAGE_SUMARY,
  })
  @ApiResponse(userAuthResponse())
  @ApiResponse(unauthorizedResponse())
  @ApiResponse(badRequestResponse())
  @ApiResponse(notFoundResponse(MESSAGES.VALIDATION_MESSAGES.USER.LOGIN.USER_NOT_FOUND))
  @ApiResponse(internalServerErrorResponse())
  async login(@Body() body: LoginBodyDTO) {
    return await this.authService.login(body)
  }

  @SkipThrottle({ short: false, long: false })
  @Post('refresh-token')
  @HttpCode(HttpStatus.OK)
  async refreshToken(@Body() body: RefreshTokenDTO) {
    return await this.authService.refreshToken(body)
  }

  @SkipThrottle({ short: false, long: false })
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Post('logout')
  @HttpCode(HttpStatus.OK)
  async logout(@Body() body: LogoutBodyDTO) {
    return await this.authService.logout(body)
  }

  /**
   * Retrieves the authenticated user's profile.
   *
   * @param userId - The ID of the active user.
   * @returns The user's profile information.
   */

  @SkipThrottle({ short: false, long: false })
  @Post('otp')
  @HttpCode(HttpStatus.OK)
  async sentOTP(@Body() body: SendOTPBodyDTO) {
    return await this.authService.sendOTP(body)
  }

  @SkipThrottle({ short: false, long: false })
  @Post('forgot-password')
  @HttpCode(HttpStatus.OK)
  async forgotPassword(@Body() body: ForgotPasswordBodyDTO) {
    return await this.authService.forgotPassword(body)
  }

  /**
   * Retrieves the authenticated user's profile.
   *
   * @param userId - The ID of the active user.
   * @returns The user's profile information.
   */
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Get('profile')
  @HttpCode(HttpStatus.OK)
  @ApiResponse(userAuthResponse())
  @ApiResponse(unauthorizedResponse())
  @ApiResponse(badRequestResponse())
  @ApiResponse(notFoundResponse(MESSAGES.VALIDATION_MESSAGES.USER.PROFILE.USER_NOT_FOUND))
  @ApiResponse(internalServerErrorResponse())
  async getProfileUser(@ActiveUser('userId') userId: string) {
    return await this.authService.getUserProfile(userId)
  }

  /**
   * Updates the authenticated user's profile.
   *
   * @param userId - The ID of the active user.
   * @param body - The profile fields to update.
   * @returns The updated profile information.
   */
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Patch('profile')
  @HttpCode(HttpStatus.OK)
  @ApiResponse(userAuthResponse())
  @ApiResponse(unauthorizedResponse())
  @ApiResponse(badRequestResponse())
  @ApiResponse(notFoundResponse(MESSAGES.VALIDATION_MESSAGES.USER.PROFILE.USER_NOT_FOUND))
  @ApiResponse(internalServerErrorResponse())
  async updateProfile(@ActiveUser('userId') userId: string, @Body() body: UpdateUserProfileDTO) {
    return await this.authService.updateUserProfile(userId, body)
  }
  /**
   * Returns the Facebook OAuth authorization URL.
   *
   * @param deviceId - Device identifier
   * @param ip - Client IP address
   * @returns The Facebook login URL
   */

  @Get('facebook')
  @IsPublic()
  async getFacebookAuthUrl(@DeviceId() deviceId: string, @Ip() ip: string) {
    return this.facebookService.getAuthorizationUrl({ deviceId, ipAddress: ip })
  }

  /**
   * Handles the Facebook OAuth callback, exchanging the authorization code for tokens.
   *
   * @param code - The authorization code from Facebook.
   * @param state - The state parameter for CSRF protection.
   * @param res - The HTTP response object for redirecting.
   * @returns Redirects to the client with access and refresh tokens or an error message.
   */
  @Get('facebook/callback')
  @IsPublic()
  @HttpCode(HttpStatus.OK)
  async facebookCallback(@Query('code') code: string, @Query('state') state: string, @Res() res: Response) {
    const redirectUrl = await handleOAuthCallback(
      this.facebookService,
      this.facebookRedirectBase,
      code,
      state,
      AuthError.FACEBOOK_LOGIN_FAILED,
    )

    return res.redirect(redirectUrl.toString())
  }
  /**
   * Uploads a new avatar image and updates the user's profile.
   *
   * @param userId - The ID of the authenticated user.
   * @param file - The uploaded avatar image.
   * @returns Success message + new avatar URL.
   */
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Post('avatar')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  async uploadAvatar(
    @ActiveUser('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
  ): Promise<UpdateAvatarResType> {
    if (!file) {
      throw NoFileProvidedException
    }

    const avatarUrl = await this.cloudinaryService.uploadImage(file)
    return this.authService.updateUserAvatar(userId, avatarUrl)
  }

  @Get('google')
  @IsPublic()
  @HttpCode(HttpStatus.OK)
  getGoogleAuthUrl(
    @DeviceId() deviceId: string,
    @Ip() ipAddress: string,
  ) {
    return this.googleService.getAuthorizationUrl({ deviceId, ipAddress })
  }

  @Get('google/callback')
  @IsPublic()
  @HttpCode(HttpStatus.OK)
  async googleCallback(
    @Query('code') code: string,
    @Query('state') state: string,
    @Res() res: Response,
  ) {
    const redirectUrl = await handleOAuthCallback(
      this.googleService,
      this.googleRedirectBase,
      code,
      state,
      AuthError.GOOGLE_LOGIN_FAILED,
    )
    return res.redirect(redirectUrl.toString())
  }
}
