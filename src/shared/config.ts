// src/shared/config.ts
import { Logger } from '@nestjs/common';
import { config as loadDotenv } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

// ---- Load env (DEV only) ----
const ENV_PATH = path.resolve('.env');
const isRailway =
  !!process.env.RAILWAY_ENVIRONMENT || !!process.env.RAILWAY_STATIC_URL;
const isProd = process.env.NODE_ENV === 'production';

if (!isProd && !isRailway) {
  if (fs.existsSync(ENV_PATH)) {
    loadDotenv({ path: ENV_PATH });
    Logger.log(`Loaded env from ${ENV_PATH}`);
  } else {
    Logger.warn(
      `No .env found at ${ENV_PATH} (DEV mode) — using process.env only`,
    );
  }
} else {
  // Prod/Railway: rely entirely on process.env (Railway Variables)
  Logger.log('Production/Railway environment — skipping .env file load');
}

// ---- Types / enums ----
export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
  Provision = 'provision',
}

// ---- Schema ----
// Lưu ý: PORT để default '8080' để hợp với Railway (có thể override bằng biến môi trường)
const EnvSchema = z.object({
  NODE_ENV: z.nativeEnum(Environment).default(Environment.Production),

  PORT: z
    .string()
    .default('8080')
    .transform(Number)
    .refine((val) => !isNaN(val), { message: 'PORT must be a number' }),

  PORT_DEFAULT: z
    .string()
    .default('3000')
    .transform(Number)
    .refine((val) => !isNaN(val), { message: 'PORT_DEFAULT must be a number' }),

  DATABASE_URL: z.string().url({ message: 'DATABASE_URL must be a valid URL' }),

  ACCESS_TOKEN_SECRET: z.string().min(10),
  REFRESH_TOKEN_SECRET: z.string().min(10),
  ACCESS_TOKEN_EXPIRATION: z.string(),
  REFRESH_TOKEN_EXPIRATION: z.string(),
  SALT_ROUNDS: z
    .string()
    .transform(Number)
    .refine((val) => !isNaN(val), { message: 'SALT_ROUNDS must be a number' }),

  SECRET_API_KEY: z.string().min(10),
  SWAGGER_USERNAME: z.string(),
  SWAGGER_PASSWORD: z.string(),

  ADMIN_PASSWORD: z
    .string()
    .min(8, { message: 'ADMIN_PASSWORD must be at least 8 characters long' }),
  ADMIN_EMAIL: z
    .string()
    .email({ message: 'ADMIN_EMAIL must be a valid email address' }),
  ADMIN_FIRST_NAME: z
    .string()
    .min(1, { message: 'ADMIN_FIRST_NAME must not be empty' }),
  ADMIN_LAST_NAME: z
    .string()
    .min(1, { message: 'ADMIN_LAST_NAME must not be empty' }),
  ADMIN_PHONE: z
    .string()
    .min(10, { message: 'ADMIN_PHONE must be at least 10 characters long' }),

  GOOGLE_CLIENT_ID: z.string().min(1, 'GOOGLE_CLIENT_ID is required'),
  GOOGLE_CLIENT_SECRET: z.string().min(1, 'GOOGLE_CLIENT_SECRET is required'),
  GOOGLE_REDIRECT_URL: z
    .string()
    .url({ message: 'GOOGLE_REDIRECT_URL must be a valid URL' }),
  GOOGLE_CLIENT_REDIRECT_URI: z
    .string()
    .url({ message: 'GOOGLE_CLIENT_REDIRECT_URI must be a valid URL' }),

  FACEBOOK_APP_ID: z.string().min(1, 'FACEBOOK_APP_ID is required'),
  FACEBOOK_APP_SECRET: z.string().min(1, 'FACEBOOK_APP_SECRET is required'),
  FACEBOOK_REDIRECT_URL: z
    .string()
    .url({ message: 'FACEBOOK_REDIRECT_URL must be a valid URL' }),
  FACEBOOK_CLIENT_REDIRECT_URI: z
    .string()
    .url({ message: 'FACEBOOK_CLIENT_REDIRECT_URI must be a valid URL' }),

  GOOGLE_OAUTH_SCOPES: z
    .string()
    .transform((val) => val.split(',').map((s) => s.trim()))
    .refine((arr) => arr.length > 0, {
      message: 'GOOGLE_OAUTH_SCOPES must contain at least one scope',
    }),
  GOOGLE_OAUTH_ACCESS_TYPE: z.enum(['online', 'offline'], {
    message: 'GOOGLE_OAUTH_ACCESS_TYPE is required',
  }),

  FACEBOOK_AUTH_URL: z
    .string()
    .url({ message: 'FACEBOOK_AUTH_URL must be a valid URL' }),
  FACEBOOK_TOKEN_URL: z
    .string()
    .url({ message: 'FACEBOOK_TOKEN_URL must be a valid URL' }),

  OAUTH_DEFAULT_FULL_NAME: z
    .string()
    .min(1, { message: 'OAUTH_DEFAULT_FULL_NAME is required' }),
  OAUTH_DEFAULT_PHONE_NUMBER: z
    .string()
    .min(1, { message: 'OAUTH_DEFAULT_PHONE_NUMBER is required' }),
  OAUTH_DEFAULT_AVATAR: z
    .string()
    .min(1, { message: 'OAUTH_DEFAULT_AVATAR is required' }),

  OTP_EXPIRES_IN: z.string().default('5m'),
  OTP_EMAIL: z.string().email(),
  OTP_EMAIL_PASSWORD: z.string(),
  OTP_DIGIT: z.string().transform(Number),

  EMAIL_HOST: z.string(),
  EMAIL_PORT: z.string().transform(Number),

  CLOUDINARY_NAME: z
    .string()
    .min(1, { message: 'CLOUDINARY_NAME is required' }),
  CLOUDINARY_API_KEY: z
    .string()
    .min(1, { message: 'CLOUDINARY_API_KEY is required' }),
  CLOUDINARY_API_SECRET: z
    .string()
    .min(1, { message: 'CLOUDINARY_API_SECRET is required' }),
  CLOUDINARY_DEFAULT_FOLDER: z.string().default('avatars'),
  CLOUDINARY_RETRY_ATTEMPTS: z
    .string()
    .default('3')
    .transform(Number)
    .refine((v) => Number.isInteger(v) && v >= 0, {
      message: 'CLOUDINARY_RETRY_ATTEMPTS must be a non-negative integer',
    }),
  CLOUDINARY_MIN_TIMEOUT_MS: z
    .string()
    .default('1000')
    .transform(Number)
    .refine((v) => Number.isInteger(v) && v >= 0, {
      message: 'CLOUDINARY_MIN_TIMEOUT_MS must be a non-negative integer',
    }),
  CLOUDINARY_MAX_TIMEOUT_MS: z
    .string()
    .default('5000')
    .transform(Number)
    .refine((v) => Number.isInteger(v) && v >= 0, {
      message: 'CLOUDINARY_MAX_TIMEOUT_MS must be a non-negative integer',
    }),
});

// ---- Validate ----
const parsedEnv = EnvSchema.safeParse(process.env);
if (!parsedEnv.success) {
  // In prod, vẫn fail nhanh để không chạy với cấu hình sai
  // Log chi tiết lỗi để bạn biết thiếu biến nào trên Railway Variables
  Logger.error('Invalid environment variables:', parsedEnv.error.format());
  process.exit(1);
}

// ---- Export ----
export const envConfig = {
  nodeEnv: parsedEnv.data.NODE_ENV,
  port: parsedEnv.data.PORT,
  portDefault: parsedEnv.data.PORT_DEFAULT,
  databaseUrl: parsedEnv.data.DATABASE_URL,

  accessTokenSecret: parsedEnv.data.ACCESS_TOKEN_SECRET,
  refreshTokenSecret: parsedEnv.data.REFRESH_TOKEN_SECRET,
  accessTokenExpiration: parsedEnv.data.ACCESS_TOKEN_EXPIRATION,
  refreshTokenExpiration: parsedEnv.data.REFRESH_TOKEN_EXPIRATION,
  saltRounds: parsedEnv.data.SALT_ROUNDS,
  secretApiKey: parsedEnv.data.SECRET_API_KEY,

  swaggerUsername: parsedEnv.data.SWAGGER_USERNAME,
  swaggerPassword: parsedEnv.data.SWAGGER_PASSWORD,

  adminPassword: parsedEnv.data.ADMIN_PASSWORD,
  adminEmail: parsedEnv.data.ADMIN_EMAIL,
  adminFirstName: parsedEnv.data.ADMIN_FIRST_NAME,
  adminLastName: parsedEnv.data.ADMIN_LAST_NAME,
  adminPhone: parsedEnv.data.ADMIN_PHONE,

  googleClientId: parsedEnv.data.GOOGLE_CLIENT_ID,
  googleClientSecret: parsedEnv.data.GOOGLE_CLIENT_SECRET,
  googleRedirectUrl: parsedEnv.data.GOOGLE_REDIRECT_URL,
  googleClientRedirectUri: parsedEnv.data.GOOGLE_CLIENT_REDIRECT_URI,

  facebookAppId: parsedEnv.data.FACEBOOK_APP_ID,
  facebookAppSecret: parsedEnv.data.FACEBOOK_APP_SECRET,
  facebookRedirectUrl: parsedEnv.data.FACEBOOK_REDIRECT_URL,
  facebookClientRedirectUri: parsedEnv.data.FACEBOOK_CLIENT_REDIRECT_URI,
  facebookAuthUrl: parsedEnv.data.FACEBOOK_AUTH_URL,
  facebookTokenUrl: parsedEnv.data.FACEBOOK_TOKEN_URL,

  googleOAuthScopes: parsedEnv.data.GOOGLE_OAUTH_SCOPES,
  googleOAuthAccessType: parsedEnv.data.GOOGLE_OAUTH_ACCESS_TYPE,

  oauthDefaults: {
    FULL_NAME: parsedEnv.data.OAUTH_DEFAULT_FULL_NAME,
    PHONE_NUMBER: parsedEnv.data.OAUTH_DEFAULT_PHONE_NUMBER,
    AVATAR: parsedEnv.data.OAUTH_DEFAULT_AVATAR,
  },

  otpExpiresIn: parsedEnv.data.OTP_EXPIRES_IN,
  otpEmail: parsedEnv.data.OTP_EMAIL,
  otpEmailPassword: parsedEnv.data.OTP_EMAIL_PASSWORD,
  otpDigit: parsedEnv.data.OTP_DIGIT,

  emailHost: parsedEnv.data.EMAIL_HOST,
  emailPort: parsedEnv.data.EMAIL_PORT,

  cloudinary: {
    name: parsedEnv.data.CLOUDINARY_NAME,
    apiKey: parsedEnv.data.CLOUDINARY_API_KEY,
    apiSecret: parsedEnv.data.CLOUDINARY_API_SECRET,
    defaultFolder: parsedEnv.data.CLOUDINARY_DEFAULT_FOLDER,
  },
  retryAttempts: parsedEnv.data.CLOUDINARY_RETRY_ATTEMPTS,
  minTimeoutMs: parsedEnv.data.CLOUDINARY_MIN_TIMEOUT_MS,
  maxTimeoutMs: parsedEnv.data.CLOUDINARY_MAX_TIMEOUT_MS,
};
