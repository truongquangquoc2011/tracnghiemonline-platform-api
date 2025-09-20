import { ConfigService } from '@nestjs/config';
import { BadRequestException, Logger } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import { z } from 'zod';
import path from 'path';

// Define validation schema for file
const FileSchema = z.object({
  originalname: z.string().min(1, 'File name is required'),
  mimetype: z.string().regex(/^image\/(png|jpe?g|webp|gif)$/i, 'Unsupported image format'),
});

// Define supported MIME types
const SUPPORTED_IMAGE_MIME = new Set(['image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/gif']);

// Define Multer configuration factory
export const createMulterOptions = (configService: ConfigService): MulterOptions => {
  const logger = new Logger('MulterOptions');
  const maxFileSize = configService.get<number>('UPLOAD_MAX_FILE_SIZE', 5 * 1024 * 1024); // Default 5MB
  const allowedMimeTypes = configService.get<string[]>('UPLOAD_ALLOWED_MIME_TYPES', [
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
    'image/gif',
  ]);

  return {
    limits: { fileSize: maxFileSize },
    fileFilter: (req, file: Express.Multer.File, callback: (error: Error | null, acceptFile: boolean) => void) => {
      try {
        // Validate file
        FileSchema.refine(
          (data) => SUPPORTED_IMAGE_MIME.has(data.mimetype.toLowerCase()),
          `Unsupported MIME type. Allowed: ${Array.from(SUPPORTED_IMAGE_MIME).join(', ')}`,
        ).parse({
          originalname: file.originalname,
          mimetype: file.mimetype,
          size: file.size,
        });

        // Validate file extension
        const ext = path.extname(file.originalname).toLowerCase();
        const allowedExtensions = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
        if (!allowedExtensions.includes(ext)) {
          logger.warn(`Invalid file extension: ${ext} for file ${file.originalname}`);
          throw new BadRequestException(`Unsupported file extension. Allowed: ${allowedExtensions.join(', ')}`);
        }

        logger.log(`Valid file: ${file.originalname}`);
        callback(null, true);
      } catch (error) {
        logger.error(`Invalid file: ${file.originalname}, Error: ${error.message}`);
        callback(new BadRequestException(error.message), false);
      }
    },
  };
};