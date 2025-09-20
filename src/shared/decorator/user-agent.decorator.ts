import { createParamDecorator, ExecutionContext } from '@nestjs/common'

export const DeviceId = createParamDecorator((data: unknown, ctx: ExecutionContext): string => {
  const request = ctx.switchToHttp().getRequest()
  const userAgent = request.headers['user-agent']
  return typeof userAgent === 'string' ? userAgent : 'unknown-device'
})
