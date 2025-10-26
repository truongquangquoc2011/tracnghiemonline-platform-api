import { RoleName } from 'src/shared/constants/role.constant';
import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { HashingService } from 'src/shared/services/hashing.service';
import { PrismaService } from 'src/shared/services/prisma.service';
import { TokenService } from 'src/shared/services/token.service';
import {
  CreateOAuthUserDTO,
  ForgotPasswordBodyDTO,
  LoginBodyDTO,
  LoginResDTO,
  LogoutBodyDTO,
  RefreshTokenDTO,
  RefreshTokenResDTO,
  RegisterBodyDTO,
  RegisterResDTO,
  SendOTPBodyDTO,
} from './dto/auth.dto';
import { JwtType } from 'src/shared/@types/jwt.type';

import {
  generateOTP,
  isNotFoundPrismaError,
  isUniqueConstraintPrismaError,
} from 'src/shared/helper';
import { RolesService } from './role.service';
import { AuthRepository } from './auth.repo';
import {
  DeleteTokenFailedException,
  EmailAlreadyExistsException,
  EmailNotExistsException,
  InvalidOTPException,
  InvalidOTPExpiredExcepton,
  PasswordIncorrectException,
  RefreshTokenRevokedException,
  RoleNotFoundException,
} from './auth.error';

import { EmailService } from './../../shared/services/email.service';
import { envConfig } from 'src/shared/config';
import { MESSAGES } from 'src/shared/constants/message.constant';
import {
  OAuthUserType,
  ProfileResType,
  UpdateAvatarResType,
  UpdateUserProfileType,
  VerificationCodeSchema,
} from './auth.model';
import { buildCreateOAuthUserData } from 'src/shared/helper/oauth.helper';
import retry from 'async-retry';
import ms from 'ms';
import { addMilliseconds } from 'date-fns';
import {
  CONFIG,
  TypeVerifycationCode,
  TypeVerifycationCodeType,
} from 'src/shared/constants/auth.constant';
import z from 'zod';
import { UserNotFoundException } from 'src/shared/constants/file-error.constant';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  constructor(
    private readonly hashingService: HashingService,
    private readonly prismaService: PrismaService,
    private readonly tokenService: TokenService,
    private readonly rolesService: RolesService,
    private readonly authRepository: AuthRepository,
    private readonly emailService: EmailService,
  ) {}

  //Generate tokens
  async generateAndStoreTokens(
    userId: string,
    email: string,
    roleId: string,
    roleName: string,
  ) {
    const userInfo = { email, userId, roleId, roleName };
    const accessToken = await this.tokenService.signAccessToken(userInfo);
    const refreshToken = await this.tokenService.signRefreshToken(userInfo);
    const { exp } = await this.tokenService.verifyToken(
      refreshToken,
      JwtType.refreshToken,
    );
    await this.prismaService.refreshToken.create({
      data: {
        token: refreshToken,
        expiresAt: new Date(Number(exp) * 1000),
        userId,
      },
    });
    return {
      accessToken,
      refreshToken,
    };
  }

  // User register feature
  async register(body: RegisterBodyDTO): Promise<RegisterResDTO> {
    try {
      const user = await this.authRepository.checkUserExistsByEmail(body.email);
      //check email exist
      if (user) {
        throw EmailAlreadyExistsException;
      }
      //Hash the password
      const hashedPassword = await this.hashingService.hashPassword(
        body.password,
      );

      // find role
      const roleId = await this.rolesService.getClientRoleId();

      //Create  new user in database
      const createUser = await this.authRepository.createUser({
        email: body.email,
        password: hashedPassword,
        firstName: body.firstName,
        lastName: body.lastName,
        phone: body.phone,
        role: roleId,
      });

      return {
        id: createUser.id,
        email: createUser.email,
        firstName: createUser.firstName,
        lastName: createUser.lastName,
        phone: createUser.phone,
        role: RoleName.Client,
      };
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw EmailAlreadyExistsException;
      }
      throw error;
    }
  }

  // User login feature
  async login(body: LoginBodyDTO): Promise<LoginResDTO> {
    try {
      const user = await this.authRepository.checkUserExistsByEmail(body.email);
      if (!user) {
        throw EmailNotExistsException;
      }

      //compare body password and user password
      const isPasswordValid = await this.hashingService.comparePassword(
        body.password,
        user.password,
      );
      if (!isPasswordValid) {
        throw PasswordIncorrectException;
      }

      // find role

      // find name
      const role = await this.authRepository.findRole(user.role);
      if (!role) throw RoleNotFoundException;
      //create accesstoken anf resfreshtoken
      const { accessToken, refreshToken } = await this.generateAndStoreTokens(
        user.id,
        user.email,
        user.role,
        role.name,
      );
      return {
        users: {
          email: user.email,
          userId: user.id,
          role: role.name,
        },
        accessToken,
        refreshToken,
      };
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw EmailAlreadyExistsException;
      }
      throw error;
    }
  }

  // User Refresh Token feature
  async refreshToken(body: RefreshTokenDTO): Promise<RefreshTokenResDTO> {
    try {
      // Verify that the provided refresh token is valid
      const { userId, email } = await this.tokenService.verifyToken(
        body.refreshToken,
        JwtType.refreshToken,
      );

      //find if refresh exists in database
      const findToken = await this.authRepository.findByToken(
        body.refreshToken,
      );
      if (!findToken) {
        throw RefreshTokenRevokedException;
      }

      // delete token
      const deleteToken = await this.authRepository.deleteByToken(
        body.refreshToken,
      );
      if (!deleteToken) {
        throw DeleteTokenFailedException;
      }

      //find roleid
      const roleId = await this.rolesService.getClientRoleId();

      // find name
      const rolename = await this.authRepository.findRole(roleId);
      if (!rolename) {
        throw RoleNotFoundException;
      }
      // create new token
      const { refreshToken } = await this.generateAndStoreTokens(
        userId,
        email,
        roleId,
        rolename.name,
      );
      return {
        refreshToken,
      };
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error == RefreshTokenRevokedException ||
        error == DeleteTokenFailedException ||
        error == RoleNotFoundException
      ) {
        throw error;
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  //User Logout feature
  async logout(body: LogoutBodyDTO): Promise<{ message: string }> {
    try {
      // Verify that the provided refresh token is valid
      await this.tokenService.verifyToken(
        body.refreshToken,
        JwtType.refreshToken,
      );

      // Check if the refresh token exists in the database
      const existingToken = await this.authRepository.findByToken(
        body.refreshToken,
      );

      if (!existingToken) {
        throw RefreshTokenRevokedException;
      }

      // Revoke the token
      await this.authRepository.deleteByToken(body.refreshToken);

      return { message: 'Logout successful' };
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      if (
        isNotFoundPrismaError(error) ||
        error === RefreshTokenRevokedException
      ) {
        throw RefreshTokenRevokedException;
      }

      throw new UnauthorizedException();
    }
  }

  /**
   * Creates a new user from OAuth provider data if they don’t already exist.
   *
   * @param data - Object containing user info from OAuth provider
   * @returns The existing or newly created user
   */
  async createOAuthUserIfNotExist(
    data: CreateOAuthUserDTO,
  ): Promise<OAuthUserType> {
    const { email } = data;
    let isNewUser = false;

    try {
      const result = await this.prismaService.$transaction(async (tx) => {
        // Stage 1: Check if user already exists by email (within transaction scope)
        const existingUser = await this.authRepository.findUniqueOAuthUser(
          email,
          tx,
        );
        if (existingUser) return existingUser;

        // Stage 2: Get role ID for client user (cached for performance)
        const roleId = await this.rolesService.getClientRoleId();

        // Stage 3: Build user creation data (hashes names, avatar, sets role, etc.)
        const createData = await buildCreateOAuthUserData(
          { ...data, roleId },
          this.hashingService,
        );

        // Stage 4: Create new user in transaction and return selected fields
        const created = await this.authRepository.createOAuthUser(
          createData,
          tx,
        );
        isNewUser = true;
        return created;
      });

      // Stage 5: Logging after transaction completes successfully
      this.logger.log(MESSAGES.AUTH.OAUTH_CREATE_SUCCESS, {
        email,
        isNewUser, // Note: result.id always exists, this line is optional
      });

      // Final return
      return result;
    } catch (error) {
      // Stage 6: Log internal error with context
      this.logger.error(MESSAGES.AUTH.OAUTH_CREATE_FAILED, {
        error: error.message,
        stack: error.stack,
        email,
      });

      // Stage 7: Handle race condition (P2002 = unique constraint failed)
      if (error.code === 'P2002') {
        const existing = await this.authRepository.findUniqueUserIncludeRole({
          email,
        });

        // If somehow user still not found, something is wrong
        if (!existing) {
          throw new InternalServerErrorException(
            MESSAGES.AUTH.USER_CREATE_RACE_CONDITION,
          );
        }

        return existing;
      }

      // Stage 8: Throw fallback error for unknown cases
      throw new InternalServerErrorException(MESSAGES.AUTH.OAUTH_CREATE_FAILED);
    }
  }

  /**
   * Registers a device for the user based on userId, userAgent, and IP.
   * If the device already exists, it updates `lastActive` and marks it as active.
   * If it doesn't exist, it creates a new device record.
   *
   * @param userId - ID of the user
   * @param userAgent - User-Agent string of the device
   * @param ip - IP address of the device
   * @returns The registered or updated device
   * @throws InternalServerErrorException - If database operation fails
   */
  async registerDevice(userId: string, deviceId: string, ip: string) {
    try {
      const now = new Date();

      // Use upsert to avoid race conditions and reduce the number of queries.
      const device = await this.prismaService.device.upsert({
        where: { deviceId },
        update: {
          lastSeenAt: now,
          isActive: true,
          ipAddress: ip,
        },
        create: {
          userId,
          deviceId,
          ipAddress: ip,
          isActive: true,
          lastSeenAt: now,
        },
      });
      return device;
    } catch (error) {
      this.logger.error(MESSAGES.AUTH.DEVICE_REGISTER_FAILED, {
        error: error.message,
        userId,
        deviceId,
        ip,
      });

      throw new InternalServerErrorException(
        MESSAGES.AUTH.DEVICE_REGISTER_FAILED,
      );
    }
  }

  /**
   * Deletes all refresh tokens for a specific user and device.
   * This is used to ensure that only one valid refresh token exists per device.
   *
   * @param userId - ID of the user (MongoDB ObjectId as string)
   * @param deviceId - ID of the device (MongoDB ObjectId as string)
   * @returns Promise resolving to the count of deleted refresh tokens
   */
  async deleteRefreshTokensForDevice(userId: string, deviceId: string) {
    try {
      const result = await this.authRepository.deleteOldRefreshTokens(
        userId,
        deviceId,
      );
      return result;
    } catch (error) {
      this.logger.error(MESSAGES.AUTH.REFRESH_TOKEN_DELETE_FAILED, {
        error: error.message,
        userId,
        deviceId,
      });
      throw error;
    }
  }

  /**
   * Get user profile with role for authenticated user.
   *
   * @param userId - The ID of the user
   * @returns ProfileResType
   */
  async getUserProfile(userId: string): Promise<ProfileResType> {
    const user = await this.authRepository.findUserIncludeRoleById(userId);

    if (!user) {
      throw new BadRequestException(MESSAGES.AUTH.USER_NOT_FOUND);
    }
    await this.authRepository.validateUserStatus(userId);

    return user;
  }

  /**
   * Updates the user's profile information.
   *
   * @param userId - The ID of the user to update
   * @param data - The new profile data to update
   * @returns The updated user profile
   */
  /**
   * Updates the user's profile information.
   *
   * @param userId - The ID of the user to update
   * @param data - The new profile data to update
   * @returns A success message
   */
  async updateUserProfile(userId: string, body: UpdateUserProfileType) {
    const user = await this.authRepository.findUserIncludeRoleById(userId);
    if (!user) {
      throw new BadRequestException(MESSAGES.AUTH.USER_NOT_FOUND);
    }

    await this.authRepository.validateUserStatus(userId);

    const updated = await this.authRepository.updateUserById(userId, body);
    if (!updated) {
      throw new InternalServerErrorException(
        MESSAGES.ERROR_MESSAGES.AUTH.UPDATE,
      );
    }

    return { message: MESSAGES.AUTH.PROFILE_UPDATED };
  }

  // user User SendOTP feature
  async sendOTP(body: SendOTPBodyDTO): Promise<{ message: string }> {
    try {
      // Check if the email exists in the system
      const user = await this.authRepository.checkUserExistsByEmail(body.email);
      if (!user) {
        throw EmailNotExistsException;
      }

      // Generate a 6-digit OTP code
      const code = generateOTP(envConfig.otpDigit);

      // Set OTP expiration time based on config
      const expiresAt = addMilliseconds(new Date(), ms(envConfig.otpExpiresIn));

      // Hash the OTP code for secure storage
      const hashedCode = await this.hashingService.hashPassword(code);

      // Save the OTP code into the database
      await this.authRepository.createVerificationCode({
        email: body.email,
        code,
        expiresAt,
        hashedCode,
        type: body.type,
      });

      // Send the OTP code to the user's email
      await retry(
        async () => {
          await this.emailService.sendOTPEmail({ email: body.email, code });
          // nếu sendOTPEmail throw => retry sẽ tự chạy lại
        },
        { retries: CONFIG.EMAIL_RETRY_ATTEMPTS, minTimeout: 1000 }, // hoặc delay: 1000
      );

      // Return success response
      return { message: 'Send OTP successful' };
    } catch (error) {
      throw new UnauthorizedException();
    }
  }

  //validate code
  async validateVerificationCode(
    code: string,
    type: TypeVerifycationCodeType,
  ): Promise<z.infer<typeof VerificationCodeSchema>> {
    // Look up the verification code in the database by code and type
    const verifycationCode =
      await this.authRepository.findVerificationCodeByType(code, type);

    // If the code doesn't exist, throw an exception
    if (!verifycationCode) {
      throw InvalidOTPException;
    }

    // If the code has expired, throw a different exception
    if (verifycationCode.expiresAt < new Date()) {
      throw InvalidOTPExpiredExcepton;
    }
    // If valid and not expired, return the verification code
    return verifycationCode;
  }

  async forgotPassword(
    body: ForgotPasswordBodyDTO,
  ): Promise<{ message: string }> {
    try {
      const type = TypeVerifycationCode.RESET_PASSWORD;
      // Check if the email exists in the database
      const user = await this.authRepository.checkUserExistsByEmail(body.email);
      if (!user) {
        throw EmailNotExistsException;
      }

      // Validate the OTP code (throws error if invalid or expired)
      await this.validateVerificationCode(body.code, type);

      // Hash the new password before storing it
      const hashedPassword = await this.hashingService.hashPassword(
        body.newPassword,
      );

      // Update the user's password in the database
      await this.authRepository.updateUser({
        email: body.email,
        password: hashedPassword,
      });

      // Delete the used OTP code from the database
      await this.authRepository.deleteVerificationCode(type, body.code);

      return { message: 'change password successful' };
    } catch (error) {
      throw new UnauthorizedException();
    }
  }

  /**
   * Updates the avatar URL of the user.
   *
   * @param userId - The ID of the user.
   * @param avatarUrl - The new avatar URL.
   * @returns The updated avatar URL.
   */
  async updateUserAvatar(
    userId: string,
    avatarUrl: string,
  ): Promise<UpdateAvatarResType> {
    const user = await this.authRepository.findUserIncludeRoleById(userId);
    if (!user) {
      throw UserNotFoundException;
    }
    await this.authRepository.validateUserStatus(userId);
    const updated = await this.authRepository.updateAvatarUser(userId, {
      profilePicture: avatarUrl,
    });
    return {
      message: MESSAGES.SUCCESS_MESSAGES.USER.AVATAR_UPDATED,
      avatar: updated.profilePicture,
    };
  }
}
