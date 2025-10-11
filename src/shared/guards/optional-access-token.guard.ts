import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { TokenService } from '../services/token.service';
import { JwtType } from '../@types/jwt.type';
import { AUTH_HEADER, BEARER_PREFIX, REQUEST_USER_KEY } from '../constants/auth.constant';

/**
 * Guard Bearer "tùy chọn":
 * - Có token hợp lệ  -> gắn req.user rồi cho qua.
 * - Không có / token sai -> KHÔNG chặn request, vẫn cho qua với req.user = null.
 */
@Injectable()
export class OptionalAccessTokenGuard implements CanActivate {
  constructor(private readonly tokenService: TokenService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const req = context.switchToHttp().getRequest();
    const authHeader: string | undefined = req.headers?.[AUTH_HEADER];

    const token =
      authHeader && authHeader.startsWith(BEARER_PREFIX)
        ? authHeader.slice(BEARER_PREFIX.length).trim()
        : null;

    if (!token) {
      // guest: không gắn user, vẫn pass
      req[REQUEST_USER_KEY] = null;
      return true;
    }

    try {
      const decoded = await this.tokenService.verifyToken(token, JwtType.accessToken);
      req[REQUEST_USER_KEY] = decoded;
    } catch {
      // token sai/expired -> không chặn, để guest
      req[REQUEST_USER_KEY] = null;
    }
    return true;
  }
}
