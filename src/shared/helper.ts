import { BadRequestException, InternalServerErrorException, Logger, UnauthorizedException } from '@nestjs/common'
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library'


export function isUniqueConstraintPrismaError(error: any): error is PrismaClientKnownRequestError {
  return error instanceof PrismaClientKnownRequestError && error.code === 'P2002'
}

export function isNotFoundPrismaError(error: any): error is PrismaClientKnownRequestError {
  return error instanceof PrismaClientKnownRequestError && error.code === 'P2025'
}

export function isValidationPrismaError(error: any): error is PrismaClientKnownRequestError {
  return error instanceof PrismaClientKnownRequestError && error.code === 'P2003'
}

// Generates a random 6-digit number
export function generateOTP(length = 6): string {
  return Math.floor(100000 + Math.random() * 900000)
    .toString()
    .slice(0, length)
}

// Centralized error handler
export function handleAuthError(error: any, operation: string): never {
  Logger.error(`${operation} failed:`, error)
  if (error instanceof BadRequestException || error instanceof UnauthorizedException) {
    throw error
  }
  throw new InternalServerErrorException(`${operation} failed due to server error`)
}
