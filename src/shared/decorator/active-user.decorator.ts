// src/common/decorators/active-user.decorator.ts
import { createParamDecorator, ExecutionContext } from '@nestjs/common'
import { Request } from 'express'
import { TokenPayload } from '../@types/jwt.type'
import { REQUEST_USER_KEY } from '../constants/auth.constant'

/**
 * Extract user information from authenticated request.
 * @param field (Optional) Specific field in payload to retrieve
 * @returns Returns entire payload if no field passed, otherwise returns requested field value
 */
export const ActiveUser = createParamDecorator((field: keyof TokenPayload | undefined, context: ExecutionContext) => {
  const request = context.switchToHttp().getRequest<Request>()
  const user: TokenPayload | undefined = request[REQUEST_USER_KEY]

  if (!user) {
    return undefined
  }

  return field ? user?.[field] : user
})
