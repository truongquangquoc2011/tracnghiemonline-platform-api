import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common'
import axios from 'axios'
import { envConfig } from 'src/shared/config'
import { AuthService } from './auth.service'
import { RolesService } from './role.service'
import { AuthRepository } from './auth.repo'
import { RoleName } from 'src/shared/constants/role.constant'
import { AuthStateType, OAuthUserType } from './auth.model'
import { MESSAGES } from 'src/shared/constants/message.constant'
import { parseOAuthState } from 'src/shared/helper/oauth.helper'

@Injectable()
export class GoogleService {
  private readonly googleAuthBaseUrl: URL
  constructor(
    private readonly authService: AuthService,
    private readonly rolesService: RolesService,
    private readonly authRepository: AuthRepository,
  ) {
    this.googleAuthBaseUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth')
  }

  /** Giống Facebook: bắt buộc có deviceId + ipAddress và state = base64 JSON */
  private generateState({ deviceId, ipAddress }: AuthStateType): string {
    if (!deviceId || !ipAddress) {
      throw new BadRequestException(MESSAGES.AUTH.DEVICE_ID_AND_IP_REQUIRED)
    }
    return Buffer.from(JSON.stringify({ deviceId, ipAddress })).toString('base64')
  }

  /** Build Google OAuth URL (giữ pattern FB) */
  getAuthorizationUrl(authState: AuthStateType): { url: string } {
    try {
      if (!envConfig.googleClientId || !envConfig.googleRedirectUrl) {
        throw new InternalServerErrorException(MESSAGES.AUTH.GOOGLE_CONFIG_MISSING)
      }

      const state = this.generateState(authState)
      const url = new URL(this.googleAuthBaseUrl)

      url.searchParams.set('client_id', envConfig.googleClientId)
      url.searchParams.set('redirect_uri', envConfig.googleRedirectUrl)
      url.searchParams.set('response_type', 'code')
      url.searchParams.set('scope', 'openid email profile')
      url.searchParams.set('state', state)
      // nếu muốn lấy refresh_token từ Google:
      url.searchParams.set('access_type', 'offline')

      return { url: url.toString() }
    } catch (error) {
      throw error instanceof BadRequestException || error instanceof InternalServerErrorException
        ? error
        : new InternalServerErrorException(MESSAGES.AUTH.GOOGLE_AUTH_URL_FAILED)
    }
  }

  /** Được gọi bởi helper trong controller: trả về { accessToken, refreshToken } giống Facebook */
  async handleCallback(input: { code: string; state: string }): Promise<{ accessToken: string; refreshToken: string }> {
    try {
      if (!input.code || !input.state) {
        throw new BadRequestException(MESSAGES.AUTH.GOOGLE_CODE_OR_STATE_MISSING)
      }
      const { deviceId, ipAddress } = parseOAuthState(input.state)

      // 1) Đổi code -> token
      const tokenRes = await axios.post(
        'https://oauth2.googleapis.com/token',
        new URLSearchParams({
          code: input.code,
          client_id: envConfig.googleClientId,
          client_secret: envConfig.googleClientSecret,
          redirect_uri: envConfig.googleRedirectUrl,
          grant_type: 'authorization_code',
        }),
        { headers: { 'content-type': 'application/x-www-form-urlencoded' }, timeout: 5000 },
      )
      if (tokenRes.status !== 200 || !tokenRes.data?.access_token) {
        throw new BadRequestException(MESSAGES.AUTH.GOOGLE_TOKEN_EXCHANGE_FAILED)
      }
      const accessToken: string = tokenRes.data.access_token

      // 2) Lấy userinfo
      const userRes = await axios.get('https://www.googleapis.com/oauth2/v3/userinfo', {
        headers: { Authorization: `Bearer ${accessToken}` },
        timeout: 5000,
      })
      if (userRes.status !== 200) {
        throw new BadRequestException(MESSAGES.AUTH.GOOGLE_USER_FETCH_FAILED)
      }
      const profile = userRes.data as {
        sub: string
        email?: string
        given_name?: string
        family_name?: string
        name?: string
        picture?: string
      }

      // 3) Map DTO (giữ pattern FB)
      const email =
        (profile.email?.trim().toLowerCase()) ||
        `${profile.sub}@google.local` // fallback như FB dùng @facebook.local
      const firstName = (profile.given_name ?? profile.name ?? 'Google').toString().trim() || 'Google'
      const lastName =
        (profile.family_name ?? (profile.name ? profile.name.toString().trim().split(' ').slice(1).join(' ') : 'User')).toString().trim() || 'User'
      const profilePicture = profile.picture

      // 4) Core flow giống hệt FB
      const user: OAuthUserType = await this.authService.createOAuthUserIfNotExist({
        email,
        firstName,
        lastName,
        profilePicture,
      })

      // register device (ip là string bắt buộc -> fallback '')
      if (deviceId) {
        await this.authService.registerDevice(user.id, deviceId, ipAddress ?? '')
        try {
          await this.authService.deleteRefreshTokensForDevice(user.id, deviceId)
        } catch {
          // không throw, để flow tiếp tục giống FB
        }
      }

      const roleId = await this.rolesService.getClientRoleId()
      const roleName = RoleName.Client

      const tokens = await this.authService.generateAndStoreTokens(
        user.id,
        email,
        roleId,
        roleName,
      )

      return {
        accessToken: tokens.accessToken,
        refreshToken: tokens.refreshToken,
      }
    } catch (error) {
      if (error instanceof BadRequestException || error instanceof InternalServerErrorException) throw error
      throw new InternalServerErrorException(MESSAGES.AUTH.GOOGLE_CALLBACK_FAILED)
    }
  }
}
