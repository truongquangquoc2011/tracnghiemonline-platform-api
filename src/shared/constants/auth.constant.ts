import { RoleName } from 'src/shared/constants/role.constant'
export const REQUEST_USER_KEY = 'user'
export const AUTH_HEADER = 'authorization'
export const BEARER_PREFIX = 'Bearer '
export const ALGORITHMS = 'HS512'
export const API_KEY_HEADER = 'x-api-key'
export const AUTH_TYPE_KEY = 'authType'

export const AuthTypes = {
  BEARER: 'Bearer',
  APIKey: 'ApiKey',
  NONE: 'None',
} as const

export type AuthTypeType = (typeof AuthTypes)[keyof typeof AuthTypes]

export const ConditionGuard = {
  AND: 'and',
  OR: 'or',
} as const

export const UserStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
  BLOCKED: 'BLOCKED',
} as const
export type ConditionGuardType = (typeof ConditionGuard)[keyof typeof ConditionGuard]

export const userWithRoleSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  phone: true,
  address: true,
  city: true,
  country: true,
  profilePicture: true,
  dateOfBirth: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
  role: true,
}

export const UserActiveStatus = {
  ACTIVE: 'true',
  INACTIVE: 'false',
} as const
export type UserActiveStatusType = (typeof UserActiveStatus)[keyof typeof UserActiveStatus]

export const oauthUserSelect = {
  id: true,
  email: true,
  firstName: true,
  lastName: true,
  profilePicture: true,
  role: true,
}

export const TypeVerifycationCode = {
  REGISTER: 'REGISTER',
  FORGOT_PASSWORD: 'FORGOT_PASSWORD',
  CHANGE_PASSWORD: 'CHANGE_PASSWORD',
  RESET_PASSWORD: 'RESET_PASSWORD',
} as const

export type TypeVerifycationCodeType = (typeof TypeVerifycationCode)[keyof typeof TypeVerifycationCode]

export const CONFIG = {
  OTP_CODE_LENGTH: 6,
  PASSWORD_MIN_LENGTH: 6,
  PASSWORD_MAX_LENGTH: 100,
  EMAIL_RETRY_ATTEMPTS: 3,
} as const
