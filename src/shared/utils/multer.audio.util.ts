// utils/multer.audio.util.ts
import { BadRequestException, Logger } from '@nestjs/common';
import { MulterOptions } from '@nestjs/platform-express/multer/interfaces/multer-options.interface';
import path from 'path';

const logger = new Logger('MulterAudioOptions');

const SUPPORTED_AUDIO_MIME = new Set([
  'audio/mpeg',      // .mp3
  'audio/mp3',
  'audio/aac',       // .aac
  'audio/x-m4a',     // .m4a (một số client)
  'audio/m4a',       // .m4a
  'audio/mp4',       // .m4a nhưng MIME là audio/mp4  <-- THÊM
  'audio/ogg',
  'audio/opus',
  'audio/wav',
  'audio/x-wav',
  'audio/flac',
  'audio/webm',
]);

const MIME_ALIASES: Record<string, string> = {
  'audio/x-m4a': 'audio/m4a',
  'audio/x-wav': 'audio/wav',
  // nhiều file .m4a thực tế là audio/mp4 -> coi như hợp lệ
  'audio/mp4': 'audio/m4a',
};

const ALLOWED_EXT = ['.mp3', '.m4a', '.aac', '.ogg', '.opus', '.wav', '.flac', '.webm'];

export const audioMulterOptions: MulterOptions = {
  limits: {
    fileSize: parseInt(process.env.UPLOAD_MUSIC_MAX_FILE_SIZE ?? '', 10) || 15 * 1024 * 1024,
  },
  fileFilter: (req, file, callback) => {
    try {
      const rawMime = (file.mimetype || '').toLowerCase();
      const mime = MIME_ALIASES[rawMime] ?? rawMime;

      if (!SUPPORTED_AUDIO_MIME.has(mime)) {
        throw new BadRequestException(
          `Unsupported audio MIME (${rawMime}). Allowed: ${Array.from(SUPPORTED_AUDIO_MIME).join(', ')}`
        );
      }

      const ext = path.extname(file.originalname).toLowerCase();
      if (!ALLOWED_EXT.includes(ext)) {
        throw new BadRequestException(`Unsupported audio extension. Allowed: ${ALLOWED_EXT.join(', ')}`);
      }

      logger.log(`Valid audio: ${file.originalname} (${rawMime})`);
      callback(null, true);
    } catch (e: any) {
      logger.error(`Invalid audio: ${file.originalname} — ${e.message}`);
      callback(new BadRequestException(e.message), false);
    }
  },
};
