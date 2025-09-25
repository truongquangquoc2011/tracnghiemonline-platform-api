import { createZodDto } from 'nestjs-zod'
import {
  CreateOAuthUserSchema,
  DeviceResSchema,
  ForgotPasswordSchema,
  LoginBodySchema,
  LoginResSchema,
  LogoutBodySchema,
  ProfileResSchema,
  RefreshBodySchema,
  RefreshResSchema,
  RegisterBodySchema,
  RegisterResSchema,
  SendOtpSchema,
  UpdateAvatarResSchema,
  UpdateUserProfileSchema,
} from '../auth.model'

// DTO for the request body of the Register API (user registration)
export class RegisterBodyDTO extends createZodDto(RegisterBodySchema) {}

// DTO for the response of the Register API
export class RegisterResDTO extends createZodDto(RegisterResSchema) {}

// DTO for the request body of the Login API (user login)
export class LoginBodyDTO extends createZodDto(LoginBodySchema) {}

// DTO for the response of the Login API
export class LoginResDTO extends createZodDto(LoginResSchema) {}

// DTO for the request body of the Refresh Token API (refreshing tokens)
export class RefreshTokenDTO extends createZodDto(RefreshBodySchema) {}

// DTO for the response of the Refresh Token API
export class RefreshTokenResDTO extends createZodDto(RefreshResSchema) {}

// DTO for the request body of the Logout API (user logout)
export class LogoutBodyDTO extends createZodDto(LogoutBodySchema) {}

// DTO for the request body of the Get Profile API (Get user profile )
export class ProfileResDTO extends createZodDto(ProfileResSchema) {}

// DTO for the request body of the Update Profile API (Update user profile )
export class UpdateUserProfileDTO extends createZodDto(UpdateUserProfileSchema) {}

// DTO for the request body of the create Profile API (create user profile )
export class CreateOAuthUserDTO extends createZodDto(CreateOAuthUserSchema) {}

export class DeviceResDTO extends createZodDto(DeviceResSchema) {}

export class SendOTPBodyDTO extends createZodDto(SendOtpSchema) {}

export class ForgotPasswordBodyDTO extends createZodDto(ForgotPasswordSchema) {}

export class UpdateAvatarResDTO extends createZodDto(UpdateAvatarResSchema) {}