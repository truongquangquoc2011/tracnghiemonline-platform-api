import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { TokenService } from '../services/token.service'
import { JwtType } from '../@types/jwt.type'
import { AUTH_HEADER, BEARER_PREFIX, REQUEST_USER_KEY } from '../constants/auth.constant'

@Injectable()
export class AccessTokenGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest()
    const token = this.extractTokenFromHeader(request.headers[AUTH_HEADER])

    if (!token) {
      throw new UnauthorizedException('Access token is missing or malformed')
    }

    try {
      const decoded = await this.tokenService.verifyToken(token, JwtType.accessToken)
      request[REQUEST_USER_KEY] = decoded
      return true
    } catch (error) {
      throw new UnauthorizedException('Invalid access token')
    }
  }

  private extractTokenFromHeader(authHeader?: string): string | null {
    if (!authHeader || !authHeader.startsWith(BEARER_PREFIX)) return null
    return authHeader.slice(BEARER_PREFIX.length).trim()
  }
}
