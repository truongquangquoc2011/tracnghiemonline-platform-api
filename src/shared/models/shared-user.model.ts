import { z } from 'zod'
import { RoleName } from '../constants/role.constant'

// User schema
export const UserSchema = z.object({
  id: z.string(),

  email: z.string({ message: 'Error.InvalidEmail' }).email({ message: 'Error.InvalidEmailFormat' }),

  firstName: z
    .string({ message: 'Error.InvalidFirstName' })
    .min(1, { message: 'Error.FirstNameRequired' })
    .max(100, { message: 'Error.FirstNameTooLong' }),

  lastName: z
    .string({ message: 'Error.InvalidLastName' })
    .min(1, { message: 'Error.LastNameRequired' })
    .max(100, { message: 'Error.LastNameTooLong' }),

  password: z
    .string({ message: 'Error.InvalidPassword' })
    .min(6, { message: 'Error.PasswordMinLength' })
    .max(100, { message: 'Error.PasswordMaxLength' }),

  phone: z
    .string({ message: 'Error.InvalidPhoneNumber' })
    .min(10, { message: 'Error.PhoneNumberMinLength' })
    .max(15, { message: 'Error.PhoneNumberMaxLength' }),

  role: z.string({ message: 'Error.InvalidRoleId' }).default(RoleName.Client),
})

export type UserType = z.infer<typeof UserSchema>
