import { CONFIG, TypeVerifycationCode } from 'src/shared/constants/auth.constant'
import { MESSAGES } from 'src/shared/constants/message.constant'
import { UserSchema, UserType } from 'src/shared/models/shared-user.model'
import z from 'zod'

// Register request body validation schema
export const RegisterBodySchema = UserSchema.pick({
  email: true,
  firstName: true,
  lastName: true,
  password: true,
  phone: true,
  role: true,
})
  .extend({
    // Add confirmPassword field with validation rules
    confirmPassword: z
      .string()
      .min(6, 'Confirm password must be at least 6 characters long')
      .max(100, 'Confirm password must be at most 100 characters long'),
  })
  .strict()
  .superRefine(({ confirmPassword, password }, ctx) => {
    // Custom validation to ensure confirmPassword matches password
    if (confirmPassword !== password) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Confirm password does not match password',
        path: ['confirmPassword'],
      })
    }
  })

// Register response schema (omit password before returning to client)
export const RegisterResSchema = UserSchema.omit({
  password: true,
})

// Login request schema (only needs email and password)
export const LoginBodySchema = UserSchema.pick({
  email: true,
  password: true,
})

// Login response schema (contains user info and tokens)
export const LoginResSchema = z.object({
  users: z.object({
    email: z.string(),
    userId: z.string(),
    role: z.string(),
  }),
  accessToken: z.string(),
  refreshToken: z.string(),
})

// Refresh token request body schema
export const RefreshBodySchema = z.object({
  refreshToken: z.string(),
})

// Refresh token response schema
export const RefreshResSchema = z.object({
  refreshToken: z.string(),
})
export type RefreshType = z.infer<typeof RefreshResSchema>

// Logout request schema (requires refreshToken)
export const LogoutBodySchema = z.object({
  refreshToken: z.string(),
})

export const RoleResponseSchema = z.object({
  id: z.string(),
  name: z.string(),
  slug: z.string(),
  displayName: z.string(),
})
// === Device schema ===
export const DeviceSchema = z.object({
  id: z.string(), // MongoDB ObjectId
  userId: z.string(),
  deviceId: z.string(),
  ipAddress: z.string().nullable().optional(),
  lastSeenAt: z.date().nullable().optional(),
  createdAt: z.date(),
  isActive: z.boolean(),
  updatedAt: z.date(),
})
export const AuthStateSchema = DeviceSchema.pick({
  deviceId: true,
  ipAddress: true,
}).strict()

// response API get profile
export const ProfileResSchema = z.object({
  id: z.string(),
  email: z.string().email(),
  firstName: z.string(),
  lastName: z.string(),
  phone: z.string().refine((val) => val === 'N/A' || val.length >= 10, {
    message: 'Phone number must be at least 10 characters or "N/A"',
  }),
  role: z.string(),
  roleName: z.string(),
  profilePicture: z.string().nullable().optional(),
  dateOfBirth: z.date().nullable().optional(),
  isActive: z.boolean(),
  createdAt: z.date(),
  updatedAt: z.date(),
})

export const UpdateUserProfileSchema = z
  .object({
    firstName: z
      .string({ required_error: MESSAGES.VALIDATION_MESSAGES.USER.PROFILE.FULL_NAME_MUST_BE_A_STRING })
      .min(1, MESSAGES.VALIDATION_MESSAGES.USER.PROFILE.INVALID_FULLNAME)
      .max(100, MESSAGES.VALIDATION_MESSAGES.USER.PROFILE.FULL_NAME_MAX_LENGTH_IS_50)
      .optional(),
    lastName: z
      .string({ required_error: MESSAGES.VALIDATION_MESSAGES.USER.PROFILE.FULL_NAME_MUST_BE_A_STRING })
      .min(1, MESSAGES.VALIDATION_MESSAGES.USER.PROFILE.INVALID_FULLNAME)
      .max(100, MESSAGES.VALIDATION_MESSAGES.USER.PROFILE.FULL_NAME_MAX_LENGTH_IS_50)
      .optional(),
    phone: z
      .string({ required_error: MESSAGES.VALIDATION_MESSAGES.USER.PROFILE.PHONE_MUST_BE_STRING })
      .min(10, MESSAGES.VALIDATION_MESSAGES.USER.PROFILE.PHONE_LENGTH_MUST_BE_10_CHARACTER)
      .max(15, MESSAGES.VALIDATION_MESSAGES.USER.PROFILE.PHONE_LENGTH_MUST_BE_10_CHARACTER)
      .refine((val) => /^[0-9]+$/.test(val), {
        message: MESSAGES.VALIDATION_MESSAGES.USER.PROFILE.PHONE_LENGTH_MUST_BE_STRING_NUMBER,
      })
      .optional(),
    address: z
      .string({ required_error: MESSAGES.VALIDATION_MESSAGES.USER.PROFILE.ADDRESS_MUST_BE_STRING })
      .min(10, MESSAGES.VALIDATION_MESSAGES.USER.PROFILE.ADDRESS_LENGTH_IS_INVALID)
      .max(200, MESSAGES.VALIDATION_MESSAGES.USER.PROFILE.ADDRESS_LENGTH_IS_INVALID)
      .refine((val) => !/\s{2,}/.test(val), {
        message: MESSAGES.VALIDATION_MESSAGES.USER.PROFILE.ADDRESS_INCLUDES_MUL_WHITESPACE,
      })
      .optional(),
    city: z.string().optional(),
    country: z.string().optional(),
    dateOfBirth: z.coerce.date().optional(),
    profilePicture: z.string().url({ message: MESSAGES.VALIDATION_MESSAGES.USER.PROFILE.VALID_URL_AVATAR }).optional(),
  })
  .refine(
    // refine to have at least 1 field updated
    (data) => {
      return (
        data.firstName ||
        data.lastName ||
        data.phone ||
        data.address ||
        data.city ||
        data.country ||
        data.dateOfBirth ||
        data.profilePicture
      )
    },
    {
      message: MESSAGES.VALIDATION_MESSAGES.USER.PROFILE.FIELD_UPDATE_IS_REQUIRED,
    },
  )

export const ProfileResWithoutRoleNameSchema = ProfileResSchema.omit({
  roleName: true,
})

export const CreateOAuthUserSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  profilePicture: z.string().url().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
})

export const DeviceResSchema = DeviceSchema.pick({
  id: true,
  userId: true,
  deviceId: true,
  ipAddress: true,
  lastSeenAt: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
})

// Schema to validate a verification code object
const EmailSchema = z.string().email('Please provide a valid email address')
const OtpCodeSchema = z
  .string()
  .regex(/^\d{6}$/, `OTP code must be exactly ${CONFIG.OTP_CODE_LENGTH} digits`)
  .length(CONFIG.OTP_CODE_LENGTH, `OTP code must be exactly ${CONFIG.OTP_CODE_LENGTH} digits`)
const VerificationTypeSchema = z.enum(Object.values(TypeVerifycationCode) as [string, ...string[]], {
  errorMap: () => ({ message: 'Invalid verification type' }),
})
const PasswordSchema = z
  .string()
  .min(CONFIG.PASSWORD_MIN_LENGTH, `Password must be at least ${CONFIG.PASSWORD_MIN_LENGTH} characters long`)
  .max(CONFIG.PASSWORD_MAX_LENGTH, `Password must be at most ${CONFIG.PASSWORD_MAX_LENGTH} characters long`)

/**
 * Schema for a verification code object stored in the system.
 * Represents an OTP with associated metadata.
 * @example { email: "user@example.com", code: "123456", hashedCode: "...", type: "REGISTER", expiresAt: new Date(), createdAt: new Date() }
 */

export const VerificationCodeSchema = z.object({
  email: OtpCodeSchema.optional().nullable(),
  code: z.string().length(6, 'OTP code must be exactly 6 digits'),
  hashedCode: z.string().min(1, 'Hashed code is required'),
  type: VerificationTypeSchema,
  expiresAt: z.date(),
  createdAt: z.date(),
})

/**
 * Schema for sending an OTP request.
 * Validates the email and verification type.
 * @example { email: "user@example.com", type: "REGISTER" }
 */
export const SendOtpSchema = z.object({
  email: EmailSchema,
  type: VerificationTypeSchema,
})

/**
 * Schema for resetting a password using an OTP.
 * Ensures newPassword matches confirmNewPassword and validates OTP code.
 * @example { email: "user@example.com", newPassword: "newPass123", confirmNewPassword: "newPass123", code: "123456", type: "RESET_PASSWORD" }
 */
export const ForgotPasswordSchema = z
  .object({
    email: EmailSchema,
    newPassword: PasswordSchema,
    confirmNewPassword: PasswordSchema,
    code: OtpCodeSchema,
    type: VerificationTypeSchema,
  })
  .refine((data) => data.newPassword === data.confirmNewPassword, {
    message: 'Passwords do not match',
    path: ['confirmNewPassword'],
  })

export const UpdateAvatarResSchema = z.object({
  message: z.string(),
  avatar: z.string().url().nullable(),
})
export type VerificationCodeType = z.infer<typeof VerificationCodeSchema>
export type ForgotPasswordBodyType = z.infer<typeof ForgotPasswordSchema>
export type OAuthUserType = Pick<UserType, 'id' | 'email' | 'firstName' | 'lastName' | 'role'>
export type DeviceResType = z.infer<typeof DeviceResSchema>
export type RoleType = z.infer<typeof RoleResponseSchema>
export type AuthStateType = z.infer<typeof AuthStateSchema>
export type DeviceType = z.infer<typeof DeviceSchema>
export type ProfileResType = z.infer<typeof ProfileResSchema>
export type UpdateUserProfileType = z.infer<typeof UpdateUserProfileSchema>
export type ProfileResWithoutRoleNameType = z.infer<typeof ProfileResWithoutRoleNameSchema>
export type UpdateAvatarResType = z.infer<typeof UpdateAvatarResSchema>
