import { Injectable, BadRequestException, InternalServerErrorException } from '@nestjs/common'
import { envConfig } from 'src/shared/config'
import { AuthService } from './auth.service'
import { AuthStateType } from './auth.model'
import { OAUTH_SCOPES, DEFAULT_OAUTH_VALUES, API_URLS, FACEBOOK_FIELDS } from 'src/shared/constants/oauth.constant'
import { MESSAGES } from 'src/shared/constants/message.constant'
import { parseOAuthState } from 'src/shared/helper/oauth.helper'
import axios from 'axios'
import { RolesService } from './role.service'
import { AuthRepository } from './auth.repo'

interface FacebookUser {
  id: string
  name: string
  email?: string
  picture?: { data: { url: string } }
}

@Injectable()
export class FacebookService {
  private readonly facebookAuthBaseUrl: URL

  constructor(
    private readonly authService: AuthService,
    private readonly rolesService: RolesService,
    private readonly authRepository: AuthRepository,
  ) {
    this.facebookAuthBaseUrl = new URL(envConfig.facebookAuthUrl)
  }

  /** Generate encoded state string */
  private generateState({ deviceId, ipAddress }: AuthStateType): string {
    if (!deviceId || !ipAddress) {
      throw new BadRequestException(MESSAGES.AUTH.DEVICE_ID_AND_IP_REQUIRED)
    }
    return Buffer.from(JSON.stringify({ deviceId, ipAddress })).toString('base64')
  }

  /** Build Facebook OAuth URL */
  getAuthorizationUrl(authState: AuthStateType): { url: string } {
    try {
      if (!envConfig.facebookAppId || !envConfig.facebookRedirectUrl) {
        throw new InternalServerErrorException(MESSAGES.AUTH.FACEBOOK_CONFIG_MISSING)
      }

      const state = this.generateState(authState)
      const url = new URL(this.facebookAuthBaseUrl)

      url.searchParams.set('client_id', envConfig.facebookAppId)
      url.searchParams.set('redirect_uri', envConfig.facebookRedirectUrl)
      url.searchParams.set('state', state)
      url.searchParams.set('response_type', 'code') // ✅ Bắt buộc để nhận code
      url.searchParams.set('scope', OAUTH_SCOPES.FACEBOOK.join(','))
      url.searchParams.set('auth_type', 'rerequest') // ✅ Ép Facebook hỏi lại quyền email
      url.searchParams.set('display', 'popup') // (tuỳ chọn – dễ test localhost)

      return { url: url.toString() }
    } catch (error) {
      console.error(`Failed to generate Facebook auth URL: ${error.message}`)
      throw error instanceof BadRequestException
        ? error
        : new InternalServerErrorException(MESSAGES.AUTH.FACEBOOK_AUTH_URL_GENERATION_FAILED)
    }
  }

  /** Alias handler */
  async handleCallback({ code, state }: { code: string; state: string }) {
    return this.facebookCallback({ code, state })
  }

  /** Main callback logic */
  async facebookCallback({ code, state }: { code: string; state: string }) {
    try {
      const { deviceId, ipAddress } = parseOAuthState(state)
      const fbAccessToken = await this.exchangeCodeForToken(code)
      const fbUser = await this.getFacebookUser(fbAccessToken)

      // ✅ fallback nếu Facebook không trả email
      const email = fbUser.email ?? `${fbUser.id}@facebook.local`

      const [firstName, ...rest] = fbUser.name?.split(' ') ?? []
      const lastName = rest.join(' ') || DEFAULT_OAUTH_VALUES.LAST_NAME

      const user = await this.authService.createOAuthUserIfNotExist({
        email,
        firstName,
        lastName,
        profilePicture: fbUser.picture?.data?.url ?? DEFAULT_OAUTH_VALUES.AVATAR,
      })

      const device = await this.authService.registerDevice(
        user.id,
        deviceId,
        ipAddress ?? DEFAULT_OAUTH_VALUES.IP_ADDRESS,
      )

      await this.authService.deleteRefreshTokensForDevice(user.id, device.id)

      const roleId = await this.rolesService.getClientRoleId()
      const role = await this.authRepository.findRole(roleId)
      if (!role) throw new InternalServerErrorException('OAuth user role not found')

      const { accessToken, refreshToken } = await this.authService.generateAndStoreTokens(
        user.id,
        user.email,
        roleId,
        role.name,
      )

      return { accessToken, refreshToken }
    } catch (error) {
      console.error('Facebook callback failed:', error?.response?.data || error.message)
      throw error
    }
  }

  /** Exchange code -> token */
  private async exchangeCodeForToken(code: string): Promise<string> {
    if (!code) throw new BadRequestException('Authorization code is required')

    if (!envConfig.facebookAppId || !envConfig.facebookAppSecret || !envConfig.facebookRedirectUrl) {
      throw new InternalServerErrorException(MESSAGES.AUTH.FACEBOOK_CONFIG_MISSING)
    }

    const url = new URL(API_URLS.FACEBOOK_TOKEN)
    url.searchParams.set('client_id', envConfig.facebookAppId)
    url.searchParams.set('client_secret', envConfig.facebookAppSecret)
    url.searchParams.set('redirect_uri', envConfig.facebookRedirectUrl)
    url.searchParams.set('code', code)

    try {
      const res = await axios.get<{ access_token: string }>(url.toString(), { timeout: 5000 })
      if (res.status !== 200 || !res.data.access_token) {
        throw new BadRequestException(MESSAGES.AUTH.FACEBOOK_TOKEN_FETCH_FAILED)
      }
      return res.data.access_token
    } catch (error) {
      console.error('Facebook token exchange error:', error?.response?.data || error.message)
      throw new BadRequestException(MESSAGES.AUTH.FACEBOOK_TOKEN_FETCH_FAILED)
    }
  }

  /** Get Facebook user info */
  private async getFacebookUser(accessToken: string): Promise<FacebookUser> {
    if (!accessToken) throw new BadRequestException(MESSAGES.AUTH.ACCESS_TOKEN_REQUIRED)

    try {
      const url = new URL(API_URLS.FACEBOOK_USER)
      // ✅ rõ field hơn để lấy avatar to
      url.searchParams.set('fields', 'id,name,email,picture.width(512).height(512)')
      url.searchParams.set('access_token', accessToken)

      const res = await axios.get(url.toString(), { timeout: 5000 })
      if (res.status !== 200) throw new BadRequestException(MESSAGES.AUTH.FACEBOOK_USER_FETCH_FAILED)

      // console.log('Facebook user:', res.data) // 👈 bật debug nếu cần
      return res.data as FacebookUser
    } catch (error) {
      console.error('Failed to fetch Facebook user:', error?.response?.data || error.message)
      throw error instanceof BadRequestException
        ? error
        : new InternalServerErrorException(MESSAGES.AUTH.FACEBOOK_USER_FETCH_FAILED)
    }
  }
}
