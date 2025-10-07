import {
  ConflictException,
  NotFoundException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common'

// Thrown when the user provides an incorrect OTP code
export const InvalidOTPException = new UnprocessableEntityException([
  {
    message: 'Thông báo lỗi! Mã OTP không hợp lệ',
    path: 'code',
  },
])

// Thrown when the provided OTP code has expired
export const InvalidOTPExpiredExcepton = new UnprocessableEntityException([
  {
    message: 'Thông báo lỗi! Mã OTP đã hết hạn',
    path: 'code',
  },
])

// Thrown when trying to register or use an email that already exists
export const EmailAlreadyExistsException = new ConflictException({
  message: 'Thông báo lỗi! Email đã tồn tại',
  path: 'email',
})

// Thrown when the system fails to send an OTP to the email
export const FailedToSendOTPException = new UnprocessableEntityException({
  message: 'Thông báo lỗi! Gửi mã OTP thất bại',
  path: 'email',
})

// Thrown when the given email does not exist in the system
export const EmailNotExistsException = new UnprocessableEntityException({
  message: 'Thông báo lỗi! Email không tồn tại',
  path: 'email',
})

// Thrown when the user provides an incorrect password
export const PasswordIncorrectException = new UnprocessableEntityException({
  message: 'Thông báo lỗi! Mật khẩu không đúng',
  path: 'password',
})

// Thrown when a refresh token has been revoked or is invalid
export const RefreshTokenRevokedException = new UnauthorizedException({
  message: 'Thông báo lỗi! Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại',
  path: 'refreshToken',
})

// Thrown when a refresh token has been revoked or is invalid
export const RefreshNoExits = new UnauthorizedException({
  message: 'Thông báo lỗi! Phiên đăng nhập không tồn tại, vui lòng đăng nhập lại',
  path: 'refreshToken',
})

// Thrown when the system can't find the specified role
export const RoleNotFoundException = new NotFoundException({
  message: 'Thông báo lỗi! Vai trò không tồn tại',
  path: 'role',
})

// Thrown when deletion of a refresh token fails
export const DeleteTokenFailedException = new NotFoundException({
  message: 'Thông báo lỗi! Xoá phiên đăng nhập thất bại',
  path: 'refreshToken',
})

// Thrown when a refresh token is used again after already being used
export const RefreshTokenAlreadyUsedException = new UnauthorizedException('Error.RefreshTokenAlreadyUsed')

// Thrown when a user attempts an unauthorized action
export const UnauthorizedAccessException = new UnauthorizedException('Error.UnauthorizedAccess')

// Thrown when both TOTP and code are invalid in 2FA verification
export const InvalidTOTPAndCodeException = new UnprocessableEntityException([
  {
    message: 'Thông báo lỗi! Mã TOTP không hợp lệ',
    path: 'totpCode',
  },
  {
    message: 'Thông báo lỗi! Mã OTP không hợp lệ',
    path: 'code',
  },
])

// Thrown when trying to enable 2FA that is already enabled
export const TOTPAlreadyEnabledException = new ConflictException({
  message: 'Thông báo lỗi! Tài khoản đã được bật xác thực hai yếu tố',
  path: 'totpCode',
})

// Thrown when the provided TOTP is invalid
export const InvalidTOTPException = new UnprocessableEntityException({
  message: 'Thông báo lỗi! Mã TOTP không hợp lệ',
  path: 'totpCode',
})

// Thrown when attempting an action requiring TOTP while 2FA is not enabled
export const TOTPNotEnabledException = new UnprocessableEntityException({
  message: 'Thông báo lỗi! Tài khoản chưa bật xác thực hai yếu tố',
  path: 'totpCode',
})
