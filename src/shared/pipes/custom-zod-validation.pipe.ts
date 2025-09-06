import { UnprocessableEntityException } from '@nestjs/common'
import { createZodValidationPipe } from 'nestjs-zod'
import type { ZodError, ZodIssue } from 'zod'

const CustomZodValidationPipe: any = createZodValidationPipe({
  createValidationException: (zerr: ZodError) => {
    return new UnprocessableEntityException(
      zerr.issues.map((iss: ZodIssue & { keys?: string[] }) => ({
        message: iss.message,
        path:
          iss.code === 'unrecognized_keys' && iss.keys?.length === 1
            ? iss.keys[0]
            : iss.path.length > 0
              ? iss.path.join('.')
              : 'body',
      })),
    )
  },
})

export default CustomZodValidationPipe
