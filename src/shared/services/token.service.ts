import { Injectable, UnauthorizedException } from '@nestjs/common'
import { JsonWebTokenError, JwtService, TokenExpiredError } from '@nestjs/jwt'
import { JwtType, TokenPayload } from '../@types/jwt.type'
import { AccessTokenDto, RefreshTokenDto } from '../dto/jwt.dto'
import { ALGORITHMS } from '../constants/auth.constant'
import { envConfig } from '../config'

@Injectable()
export class TokenService {
  constructor(private readonly jwtService: JwtService) {}

  signAccessToken(payload: AccessTokenDto): string {
    return this.jwtService.sign(payload, {
      expiresIn: envConfig.accessTokenExpiration,
      secret: envConfig.accessTokenSecret,
      algorithm: ALGORITHMS,
    })
  }

  signRefreshToken(payload: RefreshTokenDto): string {
    return this.jwtService.sign(payload, {
      expiresIn: envConfig.refreshTokenExpiration,
      secret: envConfig.refreshTokenSecret,
      algorithm: ALGORITHMS,
    })
  }

  async verifyToken(token: string, type: JwtType): Promise<TokenPayload> {
    const secret = type === JwtType.accessToken ? envConfig.accessTokenSecret : envConfig.refreshTokenSecret
    try {
      const payload = await this.jwtService.verifyAsync<TokenPayload>(token, {
        secret,
        algorithms: [ALGORITHMS],
      })
      return payload
    } catch (err) {
      if (err instanceof TokenExpiredError) {
        throw new UnauthorizedException('Token has expired')
      }
      if (err instanceof JsonWebTokenError) {
        throw new UnauthorizedException('Invalid token')
      }
      throw new UnauthorizedException('Token verification failed')
    }
  }
}
