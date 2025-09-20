import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { API_KEY_HEADER } from '../constants/auth.constant'
import { envConfig } from '../config'

@Injectable()
export class ApiKeyGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest()
    const apiKeyFromRequest = request.headers[API_KEY_HEADER]
    if (!this.isApiKeyValid(apiKeyFromRequest)) {
      throw new UnauthorizedException('Invalid or missing API key')
    }
    return true
  }

  private isApiKeyValid(apiKey: string): boolean {
    const validApiKey = envConfig.secretApiKey
    return apiKey === validApiKey
  }
}
