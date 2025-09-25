import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { UserType } from 'src/shared/models/shared-user.model'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  DeviceResType,
  DeviceType,
  ProfileResType,
  ProfileResWithoutRoleNameType,
  RefreshType,
  RoleType,
  UpdateUserProfileType,
  VerificationCodeSchema,
  VerificationCodeType,
} from './auth.model'
import {
  oauthUserSelect,
  TypeVerifycationCodeType,
  UserActiveStatusType,
  userWithRoleSelect,
} from 'src/shared/constants/auth.constant'
import { MESSAGES } from 'src/shared/constants/message.constant'
import { UpdateUserProfileDTO } from './dto/auth.dto'
import { isNotFoundPrismaError } from 'src/shared/helper'
import z from 'zod'
import { UserNotFoundException } from 'src/shared/constants/file-error.constant'

@Injectable()
export class AuthRepository {
  // Inject PrismaService to interact with the database
  constructor(private readonly prismaService: PrismaService) {}
  private buildWhereClause(uniqueObject: { email: string } | { id: string }) {
    return 'email' in uniqueObject ? { email: uniqueObject.email } : { id: uniqueObject.id }
  }
  private readonly CONFIG = {
    SELECT_USER_FIELDS: {
      id: true,
      email: true,
      firstName: true,
      lastName: true,
      phone: true,
      role: true,
      password: true,
    },
  }
  /**
   * Check if a user already exists by their email address
   * @param email - The email to search for
   * @returns The user if found, otherwise null
   */
  async checkUserExistsByEmail(email: string): Promise<UserType | null> {
    const user = await this.prismaService.user.findUnique({
      where: { email },
      select: this.CONFIG.SELECT_USER_FIELDS,
    })
    return user
  }

  /**
   * Create a new user in the database
   * @param user - Object containing email, name, password, phone, and role
   * @returns The created user without the password field
   */
  async createUser(
    user: Pick<UserType, 'email' | 'firstName' | 'lastName' | 'password' | 'phone' | 'role'>,
  ): Promise<Omit<UserType, 'password'>> {
    const createdUser = await this.prismaService.user.create({
      data: user,
    })
    // Exclude password from the returned object for security reasons
    const { password, ...safeUser } = createdUser
    return safeUser
  }

  /**
   * Find a role by its ID
   * @param roleid - The role ID as a string
   * @returns The role object if found
   */
  async findRole(roleId: string): Promise<RoleType | null> {
    const roleInfor = await this.prismaService.role.findUnique({
      where: {
        id: roleId,
      },
      select: {
        id: true,
        name: true,
        slug: true,
        displayName: true,
      },
    })

    return roleInfor
  }

  /**
   * Find a refresh token in the database
   * @param token - The refresh token string
   * @returns The token record if found
   */
  async findByToken(token: string): Promise<RefreshType | null> {
    const result = await this.prismaService.refreshToken.findUnique({
      where: { token },
      select: {
        token: true,
      },
    })
    if (!result) return null
    return {
      refreshToken: result.token,
    }
  }

  /**
   * Delete a refresh token from the database
   * @param token - The refresh token string
   * @returns The deleted token record
   */
  async deleteByToken(token: string): Promise<RefreshType> {
    const result = await this.prismaService.refreshToken.delete({
      where: { token },
      select: {
        token: true,
      },
    })
    return {
      refreshToken: result.token,
    }
  }
  /**
   * Finds a user and their associated role by a unique identifier (email or ID).
   * Commonly used during login to retrieve user-role pair.
   *
   * @param uniqueObject - Object with either email or ID
   * @returns Promise resolving to user with role or null if not found
   */
  async findUniqueUserIncludeRole(uniqueObject: { email: string } | { id: string }): Promise<UserType | null> {
    const where = this.buildWhereClause(uniqueObject)

    const user = await this.prismaService.user.findUnique({
      where,
      select: {
        id: true,
        email: true,
        firstName: true,
        lastName: true,
        phone: true,
        password: true,
        role: true,
      },
    })

    if (!user) {
      throw new NotFoundException(MESSAGES.AUTH.USER_NOT_FOUND)
    }
    return user
  }

  /**
   * Updates a specific device record.
   * @param deviceId - The ID of the device to update (MongoDB ObjectId as string)
   * @param data - The data to update the device with
   * @returns Promise resolving to the updated device data
   */
  async updateDevice(deviceId: string, data: Partial<DeviceType>): Promise<DeviceResType> {
    return this.prismaService.device.update({
      where: {
        id: deviceId,
      },
      data,
      select: {
        id: true,
        userId: true,
        deviceId: true,
        ipAddress: true,
        lastSeenAt: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    })
  }

  /**
   * Creates a new device record associated with a user.
   * Used to track login sessions and device activity.
   *
   * @param data - Includes userId, deviceId, ipAddress, and optionally lastSeenAt or isActive
   * @returns Promise resolving to the created device
   */
  async createDevice(
    data: Pick<DeviceType, 'userId' | 'deviceId' | 'ipAddress'> & Partial<Pick<DeviceType, 'lastSeenAt' | 'isActive'>>,
  ): Promise<DeviceType> {
    const deviceData = {
      ...data,
      lastSeenAt: data.lastSeenAt ?? new Date(),
      isActive: data.isActive ?? true,
    }

    return await this.prismaService.device.create({
      data: deviceData,
    })
  }
  /**
   * Deletes all refresh tokens associated with a specific user and device.
   * Used to ensure only one valid refresh token exists per device.
   *
   * @param userId - ID of the user (as string)
   * @param deviceId - ID of the device (as string)
   * @returns Promise resolving to the count of deleted refresh tokens
   */
  async deleteOldRefreshTokens(userId: string, deviceId: string): Promise<{ count: number }> {
    return this.prismaService.refreshToken.deleteMany({
      where: {
        userId,
        deviceId,
      },
    })
  }

  async findDeviceByDeviceId(deviceId: string): Promise<DeviceType | null> {
    return this.prismaService.device.findUnique({
      where: { deviceId },
    })
  }
  /**
   * Get user profile with role for authenticated user.
   *
   * @param userId - The ID of the user
   * @returns ProfileResType
   */
  async findUserIncludeRoleById(userId: string): Promise<ProfileResType> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: userWithRoleSelect,
    })

    if (!user) {
      throw new BadRequestException(MESSAGES.AUTH.USER_NOT_FOUND)
    }

    // Get additional information about the role from the role table (using user.role as roleId)
    const role = await this.findRole(user.role)
    if (!role) {
      throw new BadRequestException(MESSAGES.ERROR_MESSAGES.ROLE.NOT_FOUND)
    }

    return {
      ...user,
      roleName: role.name,
    }
  }
  async validateUserStatus(userId: string): Promise<void> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: { isActive: true },
    })

    if (!user) {
      throw new BadRequestException(MESSAGES.AUTH.USER_NOT_FOUND)
    }

    if (!user.isActive) {
      throw new UnauthorizedException(MESSAGES.ERROR_MESSAGES.USER.ACCOUNT_INACTIVE)
    }
  }
  /**
   * Updates the user's profile information.
   *
   * @param userId - The ID of the user to update
   * @param data - The new profile data to update
   * @returns The updated user profile
   */
  async updateUserById(userId: string, data: UpdateUserProfileDTO): Promise<ProfileResWithoutRoleNameType | null> {
    try {
      return await this.prismaService.user.update({
        where: { id: userId },
        data,
        select: userWithRoleSelect,
      })
    } catch (error) {
      if (isNotFoundPrismaError(error)) {
        return null
      }
      throw error
    }
  }

  async findUniqueOAuthUser(email: string, tx: Prisma.TransactionClient) {
    return tx.user.findUnique({
      where: { email },
      select: oauthUserSelect,
    })
  }
  async createOAuthUser(data: Prisma.UserCreateInput, tx: Prisma.TransactionClient) {
    return tx.user.create({
      data,
      select: oauthUserSelect,
    })
  }
  /**
   * Deletes all expired verification codes.
   * @returns The number of deleted records
   * @example
   * await deleteExpiredVerificationCodes();
   */
  async deleteExpiredVerificationCodes(): Promise<number> {
    const result = await this.prismaService.verificationCode.deleteMany({
      where: { expiresAt: { lte: new Date() } },
    })
    return result.count
  }

  /*
   * Find a verification code by its code and type
   * @param code - Verification code
   * @param type - Type of the verification (e.g. RESET_PASSWORD, VERIFY_EMAIL)
   * @returns The verification code record if found
   * Finds a verification code by code and type, ensuring it is not expired.
   * @param code - The verification code (e.g., '123456')
   * @param type - The verification type (e.g., VerificationType.RESET_PASSWORD)
   * @returns The verification code record if found and not expired
   * @throws NotFoundException if no valid code is found
   * @example
   * await findVerificationCodeByCodeAndType('123456', VerificationType.RESET_PASSWORD);
   */
  async findVerificationCodeByType(
    code: string,
    type: TypeVerifycationCodeType,
  ): Promise<z.infer<typeof VerificationCodeSchema>> {
    const result = await this.prismaService.verificationCode.findFirst({
      where: {
        code,
        type,
        expiresAt: { gt: new Date() },
      },
    })

    if (!result) {
      throw new NotFoundException(`Verification code not found or expired for type: ${type}`)
    }

    return result
  }

  /**
   * Create a verification code (OTP/email confirmation/etc.)
   * @param payload - Verification data
   * @returns Verification code object without the hashedCode
   */
  async createVerificationCode(
    payload: Pick<VerificationCodeType, 'email' | 'code' | 'expiresAt' | 'hashedCode' | 'type'>,
  ): Promise<Omit<VerificationCodeType, 'hashedCode'>> {
    return await this.prismaService.verificationCode.create({
      data: payload,
      select: {
        email: true,
        code: true,
        type: true,
        expiresAt: true,
        createdAt: true,
      },
    })
  }

  /**
   * Update a user's password based on email
   * @param user - Object containing email and new password
   * @returns Updated user record
   */
  async updateUser(user: Pick<UserType, 'email' | 'password'>): Promise<UserType | null> {
    return await this.prismaService.user.update({
      where: {
        email: user.email,
      },
      data: {
        password: user.password,
      },
    })
  }

  /**
   * Deletes a verification code by type and code.
   * @param type - The verification type (e.g., VerificationType.RESET_PASSWORD)
   * @param code - The verification code (e.g., '123456')
   * @returns The deleted verification code record
   * @throws NotFoundException if no code is found
   * @example
   * await deleteVerificationCode(VerificationType.RESET_PASSWORD, '123456');
   */
  async deleteVerificationCode(
    type: TypeVerifycationCodeType,
    code: string,
  ): Promise<z.infer<typeof VerificationCodeSchema>> {
    return await this.prismaService.verificationCode.delete({
      where: {
        type_code: {
          type,
          code,
        },
      },
    })
  }
  /**
   * Updates the authenticated user's avatar (profile picture).
   *
   * @param userId - The ID of the authenticated user.
   * @param data - An object containing the new profile picture URL.
   * @returns The updated user's basic information, including the new profile picture.
   *
   * @throws {UserNotFoundException} If the user is not found.
   * @throws {Error} If any other Prisma error occurs during the update.
   */
  updateAvatarUser(userId: string, data: { profilePicture: string }) {
    return this.prismaService.user
      .update({
        where: { id: userId },
        data,
        select: { id: true, profilePicture: true },
      })
      .catch((error) => {
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
          throw UserNotFoundException
        }
        throw error
      })
  }
}
