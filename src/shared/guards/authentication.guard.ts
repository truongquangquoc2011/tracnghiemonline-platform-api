import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import {
  AUTH_TYPE_KEY,
  AuthTypes,
  ConditionGuard,
} from 'src/shared/constants/auth.constant';
import { AccessTokenGuard } from 'src/shared/guards/access-token.guard';
import { ApiKeyGuard } from 'src/shared/guards/api-key.guard';
import { AuthTypeDecoratorPayload } from '../decorator/auth.decorator';

@Injectable()
export class AuthenticationGuard implements CanActivate {
  private get authTypeGuardMap(): Record<string, CanActivate> {
    return {
      [AuthTypes.BEARER]: this.accessTokenGuard,
      [AuthTypes.APIKey]: this.apiKeyGuard,
      [AuthTypes.NONE]: { canActivate: () => true },
    };
  }

  constructor(
    private readonly reflector: Reflector,
    private readonly accessTokenGuard: AccessTokenGuard,
    private readonly apiKeyGuard: ApiKeyGuard,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const authTypeValue = this.reflector.getAllAndOverride<
      AuthTypeDecoratorPayload | undefined
    >(AUTH_TYPE_KEY, [context.getHandler(), context.getClass()]) ?? {
      authTypes: [AuthTypes.NONE],
      options: { condition: ConditionGuard.AND },
    };
    const guards = authTypeValue.authTypes.map(
      (authType) => this.authTypeGuardMap[authType],
    );
    let error = new UnauthorizedException();
    if (authTypeValue.options.condition === ConditionGuard.OR) {
      for (const instance of guards) {
        const canActivate = await Promise.resolve(
          instance.canActivate(context),
        ).catch((err) => {
          error = err;
          return false;
        });
        if (canActivate) {
          return true;
        }
      }
      throw error;
    } else {
      for (const instance of guards) {
        const canActivate = await Promise.resolve(
          instance.canActivate(context),
        ).catch((err) => {
          error = err;
          return false;
        });
        if (!canActivate) {
          throw new UnauthorizedException();
        }
      }
      return true;
    }
  }
}
