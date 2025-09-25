import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common'

// Thrown when the user provides an incorrect OTP code
export const InvalidOTPException = new UnprocessableEntityException([
  {
    message: 'Error.InvalidOTP',
    path: 'code',
  },
])

// Thrown when the provided OTP code has expired
export const InvalidOTPExpiredExcepton = new UnprocessableEntityException([
  {
    message: 'Error.InvalidOTPExpired',
    path: 'code',
  },
])

// Thrown when trying to register or use an email that already exists
export const EmailAlreadyExistsException = new ConflictException({
  message: 'Error.EmailAlreadyExists',
  path: 'email',
})

// Thrown when the system fails to send an OTP to the email
export const FailedToSendOTPException = new UnprocessableEntityException({
  message: 'Error.FailedToSendOTP',
  path: 'email',
})

// Thrown when the given email does not exist in the system
export const EmailNotExistsException = new UnprocessableEntityException({
  message: 'Error.EmailNotExists',
  path: 'email',
})

// Thrown when the user provides an incorrect password
export const PasswordIncorrectException = new UnprocessableEntityException({
  message: 'Error.PasswordIncorrect',
  path: 'password',
})

// Thrown when a refresh token has been revoked or is invalid
export const RefreshTokenRevokedException = new UnauthorizedException({
  message: 'Error.RefreshTokenRevoked',
  path: 'refreshToken',
})

// Thrown when a refresh token has been revoked or is invalid
export const RefreshNoExits = new UnauthorizedException({
  message: 'Error.RefreshNoExits',
  path: 'refreshToken',
})

// Thrown when the system can't find the specified role
export const RoleNotFoundException = new NotFoundException({
  message: 'Error.RoleNotFound',
  path: 'role',
})

// Thrown when deletion of a refresh token fails
export const DeleteTokenFailedException = new NotFoundException({
  message: 'Error.DeleteTokenFailed',
  path: 'refreshToken',
})

// Thrown when a refresh token is used again after already being used
export const RefreshTokenAlreadyUsedException = new UnauthorizedException('Error.RefreshTokenAlreadyUsed')

// Thrown when a user attempts an unauthorized action
export const UnauthorizedAccessException = new UnauthorizedException('Error.UnauthorizedAccess')

// Thrown when both TOTP and code are invalid in 2FA verification
export const InvalidTOTPAndCodeException = new UnprocessableEntityException([
  {
    message: 'Error.InvalidTOTPAndCode',
    path: 'totpCode',
  },
  {
    message: 'Error.InvalidTOTPAndCode',
    path: 'code',
  },
])

// Thrown when trying to enable 2FA that is already enabled
export const TOTPAlreadyEnabledException = new ConflictException({
  message: 'Error.TOTPAlreadyEnabled',
  path: 'totpCode',
})

// Thrown when the provided TOTP is invalid
export const InvalidTOTPException = new UnprocessableEntityException({
  message: 'Error.InvalidTOTP',
  path: 'totpCode',
})

// Thrown when attempting an action requiring TOTP while 2FA is not enabled
export const TOTPNotEnabledException = new UnprocessableEntityException({
  message: 'Error.TOTPNotEnabled',
  path: 'totpCode',
})
