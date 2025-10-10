// src/routes/file/file.service.ts
import {
  Injectable,
  BadRequestException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { CloudinaryService } from 'src/shared/services/cloudinary.service';
import { FilesRepository } from './file.repo';
import {
  UploadImageResType,
  UploadThemeMusicResType,
  GetAudioListResType,
} from './file.model';
import { AuthRepository } from '../auth/auth.repo';
import {
  FILE_DEFAULTS,
  FILE_ERRORS,
  FILE_MESSAGES,
  FileStatus,
} from 'src/shared/constants/file.constant';
import { PrismaService } from 'src/shared/services/prisma.service';

//  import các helper mới
import {
  assertOwnerUsable,
  assertImageFile,
  assertAudioFile,
  parseUsage,
  toISO,
} from 'src/shared/helper/file.helper';

type UploadImageInput = {
  ownerId: string;
  usage?: string;
  file: Express.Multer.File;
};
type UploadMusicInput = {
  ownerId: string;
  usage?: string; // default: THEME_MUSIC
  file: Express.Multer.File;
};

@Injectable()
export class FilesService {
  private readonly logger = new Logger(FilesService.name);

  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly filesRepo: FilesRepository,
    private readonly authRepository: AuthRepository,
    private readonly prisma: PrismaService,
  ) {}

  // ========= Uploads =========

  async uploadAndCreateImageRecord(
    input: UploadImageInput,
  ): Promise<UploadImageResType> {
    //  dùng helper
    await assertOwnerUsable(this.authRepository, input.ownerId);
    assertImageFile(input.file);

    let secureUrl = '';
    try {
      secureUrl = await this.cloudinaryService.uploadImage(input.file);

      const usage = input.usage ?? FILE_DEFAULTS.IMAGE_USAGE;

      const createdFile = await this.prisma.$transaction((tx) =>
        this.filesRepo.createFile(
          {
            ownerId: input.ownerId,
            url: secureUrl,
            mime: input.file.mimetype,
            size: input.file.size ?? 0,
            metaJson: JSON.stringify({
              usage,
              status: FileStatus.READY,
              originalname: input.file.originalname,
            }),
          },
          tx,
        ),
      );

      return {
        message: FILE_MESSAGES.IMAGE_UPLOADED,
        file: {
          id: createdFile.id,
          url: createdFile.url,
          mime: createdFile.mime,
          size: createdFile.size,
          createdAt: toISO(createdFile.createdAt), //  helper
          usage,
        },
      };
    } catch (error) {
      this.logger.error(`uploadAndCreateImageRecord failed: ${String(error)}`);
      throw error instanceof BadRequestException
        ? error
        : new InternalServerErrorException(FILE_ERRORS.UPLOAD_FAILED);
    }
  }

  async uploadAndCreateMusicRecord(
    input: UploadMusicInput,
  ): Promise<UploadThemeMusicResType> {
    await assertOwnerUsable(this.authRepository, input.ownerId); //  helper
    assertAudioFile(input.file); //  helper (đã tự cho phép video/webm)

    let secureUrl = '';
    try {
      secureUrl = await this.cloudinaryService.uploadAudio(input.file);

      const usage = input.usage ?? FILE_DEFAULTS.MUSIC_USAGE;

      const createdFile = await this.prisma.$transaction((tx) =>
        this.filesRepo.createFile(
          {
            ownerId: input.ownerId,
            url: secureUrl,
            mime: input.file.mimetype,
            size: input.file.size ?? 0,
            metaJson: JSON.stringify({
              usage,
              status: FileStatus.READY,
              originalname: input.file.originalname,
            }),
          },
          tx,
        ),
      );

      return {
        message: FILE_MESSAGES.THEME_MUSIC_UPLOADED,
        file: {
          id: createdFile.id,
          url: createdFile.url,
          mime: createdFile.mime,
          size: createdFile.size,
          createdAt: toISO(createdFile.createdAt), //  helper
          usage,
        },
      };
    } catch (error) {
      this.logger.error(`uploadAndCreateMusicRecord failed: ${String(error)}`);
      throw error instanceof BadRequestException
        ? error
        : new InternalServerErrorException(FILE_ERRORS.UPLOAD_FAILED);
    }
  }

  // ========= GET audio (global) =========
  async listAudioGlobal(
    usage: string | undefined,
    page = 1,
    limit = 20,
    onlyReady = true,
  ): Promise<GetAudioListResType> {
    try {
      const { items, total } = await this.prisma.$transaction((tx) =>
        this.filesRepo.findAllAudioGlobal(
          { usage, page, limit, onlyReady },
          tx,
        ),
      );

      return {
        items: items.map((file) => ({
          id: file.id,
          url: file.url,
          mime: file.mime,
          size: file.size,
          createdAt: toISO(file.createdAt), //  helper
          usage:
            parseUsage(file.metaJson) ?? usage ?? FILE_DEFAULTS.MUSIC_USAGE, //  helper
        })),
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error) {
      this.logger.error(`listAudioGlobal failed: ${String(error)}`);
      throw new InternalServerErrorException(FILE_ERRORS.QUERY_FAILED);
    }
  }
}
