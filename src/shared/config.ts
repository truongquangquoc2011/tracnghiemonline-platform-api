import { Logger } from '@nestjs/common';
import { config as loadDotenv } from 'dotenv';
import fs from 'fs';
import path from 'path';
import { z } from 'zod';

// Only load .env in non-production
const isProd = process.env.NODE_ENV === 'production';
const ENV_PATH = path.resolve('.env');

if (!isProd) {
  if (fs.existsSync(ENV_PATH)) {
    loadDotenv({ path: ENV_PATH });
    Logger.log(`Loaded environment from ${ENV_PATH}`);
  } else {
    Logger.warn(
      `.env file not found at "${ENV_PATH}". Using process.env only.`,
    );
  }
}

// Define allowed environments
export enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
  Provision = 'provision',
}

// Zod schema for validation
const EnvSchema = z.object({
  NODE_ENV: z
    .enum([
      Environment.Development,
      Environment.Production,
      Environment.Test,
      Environment.Provision,
    ])
    .default(Environment.Development),

  // Numbers: coerce + default
  PORT: z.coerce.number().default(8080),
  PORT_DEFAULT: z.coerce.number().default(3000),

  // Mongo URL: accept mongodb:// or mongodb+srv://
  DATABASE_URL: z.string().refine((v) => /^mongodb(\+srv)?:\/\//.test(v), {
    message: 'DATABASE_URL must start with mongodb:// or mongodb+srv://',
  }),

  ACCESS_TOKEN_SECRET: z.string().min(10),
  REFRESH_TOKEN_SECRET: z.string().min(10),
  ACCESS_TOKEN_EXPIRATION: z.string(),
  REFRESH_TOKEN_EXPIRATION: z.string(),
  SALT_ROUNDS: z.coerce.number(),

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
  GOOGLE_REDIRECT_URL: z.string(), // có thể là http/https; không bắt ép url() để linh hoạt
  GOOGLE_CLIENT_REDIRECT_URI: z.string(),

  FACEBOOK_APP_ID: z.string().min(1, 'FACEBOOK_APP_ID is required'),
  FACEBOOK_APP_SECRET: z.string().min(1, 'FACEBOOK_APP_SECRET is required'),
  FACEBOOK_REDIRECT_URL: z.string(),
  FACEBOOK_CLIENT_REDIRECT_URI: z.string(),

  GOOGLE_OAUTH_SCOPES: z
    .string()
    .transform((val) => val.split(',').map((s) => s.trim()))
    .refine((arr) => arr.length > 0, {
      message: 'GOOGLE_OAUTH_SCOPES must contain at least one scope',
    }),

  GOOGLE_OAUTH_ACCESS_TYPE: z.enum(['online', 'offline'], {
    message: 'GOOGLE_OAUTH_ACCESS_TYPE is required',
  }),
  FACEBOOK_AUTH_URL: z.string(),
  FACEBOOK_TOKEN_URL: z.string(),

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

  OTP_DIGIT: z.coerce.number(),
  EMAIL_HOST: z.string(),
  EMAIL_PORT: z.coerce.number(),

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

  CLOUDINARY_RETRY_ATTEMPTS: z.coerce
    .number()
    .default(3)
    .refine((v) => Number.isInteger(v) && v >= 0, {
      message: 'CLOUDINARY_RETRY_ATTEMPTS must be a non-negative integer',
    }),

  CLOUDINARY_MIN_TIMEOUT_MS: z.coerce
    .number()
    .default(1000)
    .refine((v) => Number.isInteger(v) && v >= 0, {
      message: 'CLOUDINARY_MIN_TIMEOUT_MS must be a non-negative integer',
    }),

  CLOUDINARY_MAX_TIMEOUT_MS: z.coerce
    .number()
    .default(5000)
    .refine((v) => Number.isInteger(v) && v >= 0, {
      message: 'CLOUDINARY_MAX_TIMEOUT_MS must be a non-negative integer',
    }),
});

// Parse + validate
const parsedEnv = EnvSchema.safeParse(process.env);

if (!parsedEnv.success) {
  // In production, don't dump all formatted errors to avoid noisy logs
  Logger.error(
    'Invalid environment variables',
    JSON.stringify(parsedEnv.error.format(), null, 2),
  );
  process.exit(1);
}

// Export a clean config object
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
