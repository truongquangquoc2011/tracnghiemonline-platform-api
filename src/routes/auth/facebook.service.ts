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
    // Base URL for Facebook OAuth login
    this.facebookAuthBaseUrl = new URL(envConfig.facebookAuthUrl)
  }

  /**
   * Generates a base64-encoded state string containing device ID and IP address.
   * Used to maintain device context between redirect and callback phases.
   *
   * @param authState - Contains deviceId and ipAddress
   * @returns base64 encoded state string
   * @throws BadRequestException if deviceId or ipAddress is missing
   */
  private generateState({ deviceId, ipAddress }: AuthStateType): string {
    if (!deviceId || !ipAddress) {
      throw new BadRequestException(MESSAGES.AUTH.DEVICE_ID_AND_IP_REQUIRED)
    }
    return Buffer.from(JSON.stringify({ deviceId, ipAddress })).toString('base64')
  }

  /**
   * Builds the Facebook OAuth authorization URL with required query parameters.
   *
   * @param authState - The client device and IP info
   * @returns URL to redirect user to Facebook login page
   * @throws InternalServerErrorException if config variables are missing
   */
  getAuthorizationUrl(authState: AuthStateType): { url: string } {
    try {
      if (!envConfig.facebookAppId || !envConfig.facebookRedirectUrl) {
        throw new InternalServerErrorException(MESSAGES.AUTH.FACEBOOK_CONFIG_MISSING)
      }

      const state = this.generateState(authState)
      const url = new URL(this.facebookAuthBaseUrl)

      // Add required query params
      url.searchParams.set('client_id', envConfig.facebookAppId)
      url.searchParams.set('redirect_uri', envConfig.facebookRedirectUrl)
      url.searchParams.set('state', state)
      url.searchParams.set('scope', OAUTH_SCOPES.FACEBOOK.join(','))

      return { url: url.toString() }
    } catch (error) {
      console.error(`Failed to generate Facebook auth URL: ${error.message}`)
      throw error instanceof BadRequestException
        ? error
        : new InternalServerErrorException(MESSAGES.AUTH.FACEBOOK_AUTH_URL_GENERATION_FAILED)
    }
  }

  /**
   * Handles the OAuth callback from Facebook after user login.
   * Acts as an alias to the internal `facebookCallback()` method.
   *
   * @param code - Authorization code from Facebook
   * @param state - Encoded device state string
   */
  async handleCallback({ code, state }: { code: string; state: string }) {
    return this.facebookCallback({ code, state })
  }

  /**
   * Core logic to process Facebook OAuth callback:
   *  - Parses state
   *  - Exchanges code for access token
   *  - Fetches Facebook user info
   *  - Creates user if not exists
   *  - Registers device, clears old tokens
   *  - Generates access and refresh tokens
   *
   * @param code - Facebook authorization code
   * @param state - Encoded device info string
   * @returns Object containing accessToken and refreshToken
   */
  async facebookCallback({ code, state }: { code: string; state: string }) {
    try {
      const { deviceId, ipAddress } = parseOAuthState(state)
      const fbAccessToken = await this.exchangeCodeForToken(code)
      const fbUser = await this.getFacebookUser(fbAccessToken)

      if (!fbUser.email) {
        throw new BadRequestException(MESSAGES.AUTH.FACEBOOK_EMAIL_NOT_FOUND)
      }

      // Split full name into first and last names
      const [firstName, ...rest] = fbUser.name?.split(' ') ?? []
      const lastName = rest.join(' ') || DEFAULT_OAUTH_VALUES.LAST_NAME

      // Create or fetch the user by email
      const user = await this.authService.createOAuthUserIfNotExist({
        email: fbUser.email,
        firstName,
        lastName,
        profilePicture: fbUser.picture?.data?.url ?? DEFAULT_OAUTH_VALUES.AVATAR,
      })

      // Register device information
      const device = await this.authService.registerDevice(
        user.id,
        deviceId,
        ipAddress ?? DEFAULT_OAUTH_VALUES.IP_ADDRESS,
      )

      // Clear any previous refresh tokens for this device
      await this.authService.deleteRefreshTokensForDevice(user.id, device.id)

      // Retrieve the default client role
      const roleId = await this.rolesService.getClientRoleId()
      const role = await this.authRepository.findRole(roleId)

      if (!role) {
        throw new InternalServerErrorException('OAuth user role not found')
      }

      // Generate access and refresh tokens
      const { accessToken, refreshToken } = await this.authService.generateAndStoreTokens(
        user.id,
        user.email,
        roleId,
        role.name,
      )

      return {
        accessToken,
        refreshToken,
      }
    } catch (error) {
      console.error(`Facebook callback failed: ${error.message}`)
      throw error
    }
  }

  /**
   * Exchanges authorization code for Facebook access token.
   *
   * @param code - Authorization code returned by Facebook
   * @returns Access token as string
   * @throws BadRequestException if token exchange fails
   */
  private async exchangeCodeForToken(code: string): Promise<string> {
    if (!code) {
      throw new BadRequestException('Authorization code is required')
    }

    if (!envConfig.facebookAppId || !envConfig.facebookAppSecret || !envConfig.facebookRedirectUrl) {
      throw new InternalServerErrorException(MESSAGES.AUTH.FACEBOOK_CONFIG_MISSING)
    }

    const url = new URL(API_URLS.FACEBOOK_TOKEN)
    url.searchParams.set('client_id', envConfig.facebookAppId)
    url.searchParams.set('client_secret', envConfig.facebookAppSecret)
    url.searchParams.set('redirect_uri', envConfig.facebookRedirectUrl)
    url.searchParams.set('code', code)

    try {
      const response = await axios.get<{ access_token: string }>(url.toString(), { timeout: 5000 })
      const data = response.data

      if (response.status !== 200 || !data.access_token) {
        throw new BadRequestException(MESSAGES.AUTH.FACEBOOK_TOKEN_FETCH_FAILED)
      }

      return data.access_token
    } catch (error) {
      console.error('Facebook token exchange error:', error?.response?.data || error.message)
      throw new BadRequestException(MESSAGES.AUTH.FACEBOOK_TOKEN_FETCH_FAILED)
    }
  }

  /**
   * Fetches the Facebook user's profile information using the access token.
   *
   * @param accessToken - Facebook access token
   * @returns FacebookUser object with ID, name, email, and avatar
   * @throws BadRequestException or InternalServerErrorException on failure
   */
  private async getFacebookUser(accessToken: string): Promise<FacebookUser> {
    if (!accessToken) {
      throw new BadRequestException(MESSAGES.AUTH.ACCESS_TOKEN_REQUIRED)
    }

    try {
      const url = new URL(API_URLS.FACEBOOK_USER)
      url.searchParams.set('fields', FACEBOOK_FIELDS.join(','))
      url.searchParams.set('access_token', accessToken)

      const res = await axios.get(url.toString(), { timeout: 5000 })

      if (res.status !== 200) {
        throw new BadRequestException(MESSAGES.AUTH.FACEBOOK_USER_FETCH_FAILED)
      }

      return res.data as FacebookUser
    } catch (error) {
      console.error('Failed to fetch Facebook user:', error?.response?.data || error.message)
      throw error instanceof BadRequestException
        ? error
        : new InternalServerErrorException(MESSAGES.AUTH.FACEBOOK_USER_FETCH_FAILED)
    }
  }
}
