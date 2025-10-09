import { CLOUDINARY_CONSTANTS } from './../constants/cloudinary.constant';
import { Injectable, BadRequestException, Logger } from '@nestjs/common';
import {
  v2 as cloudinary,
  UploadApiResponse,
  UploadApiErrorResponse,
} from 'cloudinary';
import {
  AVATAR_IMAGE_CONFIG as CFG,
  SUPPORTED_IMAGE_MIME as MIME,
} from '../constants/cloudinary.constant';
import path from 'path';
import sharp from 'sharp';
import retry from 'async-retry';
import { AudioBufferNotFoundException, ImageBufferNotFoundException } from '../constants/file-error.constant';

@Injectable()
export class CloudinaryService {
  private readonly defaultFolder: string;
  private readonly logger = new Logger(CloudinaryService.name);

  constructor() {
    cloudinary.config({
      cloud_name: CLOUDINARY_CONSTANTS.NAME,
      api_key: CLOUDINARY_CONSTANTS.API_KEY,
      api_secret: CLOUDINARY_CONSTANTS.API_SECRET,
    });
    this.defaultFolder = CLOUDINARY_CONSTANTS.DEFAULT_FOLDER;
  }

  /** Build a clean, URL-safe public_id from original filename */
  private toPublicId(originalName: string): string {
    const base = path.parse(originalName).name;
    const noAccents = base.normalize('NFKD').replace(/[\u0300-\u036f]/g, '');
    return noAccents
      .trim()
      .toLowerCase()
      .replace(/[\s_]+/g, '-') // spaces/underscores -> hyphen
      .replace(/[^a-z0-9-]+/g, '') // strip unsafe chars
      .replace(/-+/g, '-') // collapse multiple hyphens
      .slice(0, CFG.PUBLIC_ID_MAX_LEN);
  }

  /** Create an optimized square avatar buffer using Sharp (reads sizes from constants) */
  private async toAvatarBuffer(file: Express.Multer.File): Promise<Buffer> {
    const img = sharp(file.buffer)
      .rotate()
      .resize(CFG.SIZE, CFG.SIZE, { fit: CFG.FIT, position: CFG.POSITION });

    const mime = file.mimetype.toLowerCase();
    // Choose output encoder based on MIME; fall back to JPEG for safety.
    if (
      mime.includes('jpeg') ||
      mime.includes('jpg') ||
      mime === MIME.JPEG ||
      mime === MIME.JPG
    ) {
      return img.jpeg({ quality: CFG.JPEG_QUALITY, mozjpeg: true }).toBuffer();
    }
    if (mime.includes('png') || mime === MIME.PNG) {
      return img
        .png({
          compressionLevel: CFG.PNG_COMPRESSION_LEVEL,
          adaptiveFiltering: true,
        })
        .toBuffer();
    }
    if (mime.includes('webp') || mime === MIME.WEBP) {
      return img.webp({ quality: CFG.WEBP_QUALITY }).toBuffer();
    }
    // default
    return img.jpeg({ quality: CFG.JPEG_QUALITY, mozjpeg: true }).toBuffer();
  }

  /**
   * Uploads an optimized avatar image to Cloudinary and stores metadata.
   * @param file - The uploaded image file
   * @returns The secure URL of the uploaded image
   * @throws NotFoundException if the file buffer is missing
   * @throws BadRequestException if the file is invalid or upload fails
   * @example
   * const file = { buffer: Buffer.from('...'), originalname: 'avatar.jpg', mimetype: 'image/jpeg' };
   * await uploadImage(file); // Returns 'https://res.cloudinary.com/.../avatar.jpg'
   */
  async uploadImage(file: Express.Multer.File): Promise<string> {
    // Ensure the file has a buffer to work with; otherwise, bail out early.
    if (!file?.buffer) throw ImageBufferNotFoundException;

    // Normalize orientation, resize/crop to a square, and encode using Sharp (based on MIME).
    const optimizedBuffer = await this.toAvatarBuffer(file);

    // Derive a clean, URL-safe identifier from the original filename (with a safe fallback).
    const publicId = this.toPublicId(file.originalname) || 'file';

    // Read from environment variables with sensible defaults.
    const retries = parseInt(process.env.CLOUDINARY_RETRY_ATTEMPTS ?? '3', 10);
    const minTimeout = parseInt(
      process.env.CLOUDINARY_MIN_TIMEOUT_MS ?? '1000',
      10,
    );
    const maxTimeout = parseInt(
      process.env.CLOUDINARY_MAX_TIMEOUT_MS ?? '5000',
      10,
    );

    // Perform the upload with retry/backoff
    const result = await retry<string>(
      async (bail, attempt) => {
        return new Promise<string>((resolve, reject) => {
          const opts = {
            folder: this.defaultFolder,
            resource_type: 'image' as const,
            public_id: publicId,
            use_filename: CFG.USE_FILENAME,
            unique_filename: CFG.UNIQUE_FILENAME,
            overwrite: CFG.OVERWRITE,
            timeout: CFG.TIMEOUT_MS,
          };

          // Open the Cloudinary upload stream and pass the buffer
          const stream = cloudinary.uploader.upload_stream(
            opts,
            (
              error: UploadApiErrorResponse | undefined,
              res: UploadApiResponse | undefined,
            ) => {
              if (error) {
                const httpCode = (error as any)?.http_code as
                  | number
                  | undefined;
                this.logger.error(
                  `Upload failed (attempt ${attempt}): ${error.message}`,
                );
                //Don't retry with auth error
                if (httpCode === 401 || httpCode === 403) {
                  return bail(
                    new BadRequestException(
                      `Cloudinary authentication failed: ${error.message}`,
                    ),
                  );
                }
                // Other errors are transient; reject to let async-retry try again.
                return reject(
                  new BadRequestException(`Upload failed: ${error.message}`),
                );
              }
              // Defensive check: no response returned.
              if (!res) {
                return reject(
                  new BadRequestException('Upload failed: No result returned'),
                );
              }
              this.logger.log(`Uploaded image: ${res.secure_url}`);
              resolve(res.secure_url);
            },
          );

          // Start the upload by writing the optimized buffer to the stream.
          stream.end(optimizedBuffer);
        });
      },
      {
        retries,
        factor: 2,
        minTimeout,
        maxTimeout,
        randomize: true,
        onRetry: (error: unknown, attempt: number) => {
          const msg = error instanceof Error ? error.message : String(error);
          this.logger.warn(`Retrying upload (#${attempt}): ${msg}`);
        },
      },
    );
    // Return the final Cloudinary URL
    return result;
  }

  /**
   * Upload audio (mp3/m4a/ogg/...) to Cloudinary using resource_type 'video'.
   * Returns secure_url string.
   */
  async uploadAudio(file: Express.Multer.File): Promise<string> {
    if (!file?.buffer) throw AudioBufferNotFoundException;

    const publicId = this.toPublicId(file.originalname) || 'audio';

    const retries = parseInt(process.env.CLOUDINARY_RETRY_ATTEMPTS ?? '3', 10);
    const minTimeout = parseInt(
      process.env.CLOUDINARY_MIN_TIMEOUT_MS ?? '1000',
      10,
    );
    const maxTimeout = parseInt(
      process.env.CLOUDINARY_MAX_TIMEOUT_MS ?? '5000',
      10,
    );

    const result = await retry<string>(
      async (bail, attempt) => {
        return new Promise<string>((resolve, reject) => {
          const opts = {
            folder: this.defaultFolder,
            resource_type: 'video' as const, // IMPORTANT: audio = video in Cloudinary
            public_id: publicId,
            use_filename: true,
            unique_filename: true,
            overwrite: false,
            timeout: 60_000,
          };

          const stream = cloudinary.uploader.upload_stream(
            opts,
            (
              error: UploadApiErrorResponse | undefined,
              res: UploadApiResponse | undefined,
            ) => {
              if (error) {
                const httpCode = (error as any)?.http_code as
                  | number
                  | undefined;
                this.logger.error(
                  `Audio upload failed (attempt ${attempt}): ${error.message}`,
                );
                if (httpCode === 401 || httpCode === 403) {
                  return bail(
                    new BadRequestException(
                      `Cloudinary auth failed: ${error.message}`,
                    ),
                  );
                }
                return reject(
                  new BadRequestException(`Upload failed: ${error.message}`),
                );
              }
              if (!res) {
                return reject(
                  new BadRequestException('Upload failed: No result returned'),
                );
              }
              this.logger.log(`Uploaded audio: ${res.secure_url}`);
              resolve(res.secure_url);
            },
          );

          stream.end(file.buffer);
        });
      },
      {
        retries,
        factor: 2,
        minTimeout,
        maxTimeout,
        randomize: true,
        onRetry: (err, attempt) =>
          this.logger.warn(
            `Retrying audio upload (#${attempt}): ${String(err)}`,
          ),
      },
    );

    return result;
  }
}
