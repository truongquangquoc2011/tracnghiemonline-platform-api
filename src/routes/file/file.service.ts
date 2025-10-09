import { Injectable, BadRequestException } from '@nestjs/common';
import { CloudinaryService } from 'src/shared/services/cloudinary.service';
import { FilesRepository } from './file.repo';
import { UploadImageResType, UploadThemeMusicResType } from './file.model';
import { AuthRepository } from '../auth/auth.repo';
import { UserNotFoundException } from 'src/shared/constants/file-error.constant';
import {
  FILE_DEFAULTS,
  FILE_ERRORS,
  FILE_MESSAGES,
  FileStatus,
} from 'src/shared/constants/file.constant';

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
  constructor(
    private readonly cloudinaryService: CloudinaryService,
    private readonly filesRepo: FilesRepository,
    private readonly authRepository: AuthRepository,
  ) {}

  private async assertOwnerUsable(ownerId: string) {
    const user = await this.authRepository.findUserIncludeRoleById(ownerId);
    if (!user) throw UserNotFoundException;
    await this.authRepository.validateUserStatus(ownerId);
    return user;
  }

  private assertImageFile(file: Express.Multer.File) {
    if (!file?.mimetype?.startsWith('image/')) {
      throw new BadRequestException(FILE_ERRORS.INVALID_IMAGE_FILE);
    }
  }
  private assertAudioFile(file: Express.Multer.File) {
    if (!file?.mimetype?.startsWith('audio/')) {
      // chấp nhận một số trường hợp audio gửi dạng video/webm
      const okAlt = file?.mimetype?.startsWith('video/webm');
      if (!okAlt) throw new BadRequestException(FILE_ERRORS.INVALID_AUDIO_FILE);
    }
  }

  async uploadAndCreateImageRecord(
    input: UploadImageInput,
  ): Promise<UploadImageResType> {
    await this.assertOwnerUsable(input.ownerId);
    this.assertImageFile(input.file);

    const secureUrl = await this.cloudinaryService.uploadImage(input.file);

    const usage = input.usage ?? FILE_DEFAULTS.IMAGE_USAGE;

    const created = await this.filesRepo.create({
      ownerId: input.ownerId,
      url: secureUrl,
      mime: input.file.mimetype,
      size: input.file.size ?? 0,
      metaJson: JSON.stringify({
        usage,
        status: FileStatus.READY,
        originalname: input.file.originalname,
      }),
    });

    return {
      message: FILE_MESSAGES.IMAGE_UPLOADED,
      file: {
        id: created.id,
        url: created.url,
        mime: created.mime,
        size: created.size,
        createdAt:
          created.createdAt.toISOString?.() ?? String(created.createdAt),
        usage,
      },
    };
  }

  async uploadAndCreateMusicRecord(
    input: UploadMusicInput,
  ): Promise<UploadThemeMusicResType> {
    await this.assertOwnerUsable(input.ownerId);
    this.assertAudioFile(input.file);

    const secureUrl = await this.cloudinaryService.uploadAudio(input.file);

    const usage = input.usage ?? FILE_DEFAULTS.MUSIC_USAGE;

    const created = await this.filesRepo.create({
      ownerId: input.ownerId,
      url: secureUrl,
      mime: input.file.mimetype,
      size: input.file.size ?? 0,
      metaJson: JSON.stringify({
        usage,
        status: FileStatus.READY,
        originalname: input.file.originalname,
      }),
    });

    return {
      message: FILE_MESSAGES.THEME_MUSIC_UPLOADED,
      file: {
        id: created.id,
        url: created.url,
        mime: created.mime,
        size: created.size,
        createdAt:
          created.createdAt.toISOString?.() ?? String(created.createdAt),
        usage,
      },
    };
  }
  
}
