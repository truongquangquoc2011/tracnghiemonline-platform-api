import { envConfig } from '../config'

export const CLOUDINARY_CONSTANTS = {
  NAME: envConfig.cloudinary.name,
  API_KEY: envConfig.cloudinary.apiKey,
  API_SECRET: envConfig.cloudinary.apiSecret,
  DEFAULT_FOLDER: envConfig.cloudinary.defaultFolder,
}

export const AVATAR_IMAGE_CONFIG = {
  SIZE: 512,                           // square size
  FIT: 'cover' as const,               // cover | contain | fill | inside | outside
  POSITION: 'attention' as const,      // crop focal point (face-aware)
  TIMEOUT_MS: 60_000,                  // Cloudinary request timeout

  // File naming / collision policy
  USE_FILENAME: false,
  UNIQUE_FILENAME: false,
  OVERWRITE: false,

  // Compression
  JPEG_QUALITY: 82,
  WEBP_QUALITY: 80,
  PNG_COMPRESSION_LEVEL: 9,

  // Name sanitization
  PUBLIC_ID_MAX_LEN: 120,
}

export const SUPPORTED_IMAGE_MIME = {
  JPEG: 'image/jpeg',
  JPG: 'image/jpg',
  PNG: 'image/png',
  WEBP: 'image/webp',
}