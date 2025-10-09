import {
  Controller,
  Post,
  HttpCode,
  HttpStatus,
  UploadedFile,
  UseInterceptors,
  Body,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { FilesService } from './file.service';
import { Auth } from 'src/shared/decorator/auth.decorator';
import { AuthTypes, ConditionGuard } from 'src/shared/constants/auth.constant';
import { UploadImageReqDTO, UploadThemeMusicReqDTO } from './dto/file.dto';
import { UploadImageResType, UploadThemeMusicResType } from './file.model';
import { NoFileProvidedException } from 'src/shared/constants/file-error.constant';
import { ActiveUser } from 'src/shared/decorator/active-user.decorator';
import { audioMulterOptions } from 'src/shared/utils/multer.audio.util';

@Controller('files')
export class FilesController {
  constructor(private readonly filesService: FilesService) {}

  /**
   * Admin-only: Upload image to Cloudinary & persist a file record.
   * - reads ActiveUser (must be authenticated)
   * - no ownerId in body; ownerId = ActiveUser.userId
   */
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Post('image')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.OK)
  async uploadImage(
    @ActiveUser('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadImageReqDTO,
  ): Promise<UploadImageResType> {
    if (!file) throw NoFileProvidedException;

    return this.filesService.uploadAndCreateImageRecord({
      ownerId: userId,
      usage: body.usage,
      file,
    });
  }
  
  @Auth([AuthTypes.BEARER, AuthTypes.APIKey], { condition: ConditionGuard.OR })
  @Post('audio')
  @UseInterceptors(FileInterceptor('file', audioMulterOptions))
  @HttpCode(HttpStatus.OK)
  async uploadThemeMusic(
    @ActiveUser('userId') userId: string,
    @UploadedFile() file: Express.Multer.File,
    @Body() body: UploadThemeMusicReqDTO,
  ): Promise<UploadThemeMusicResType> {
    if (!file) throw NoFileProvidedException;

    return this.filesService.uploadAndCreateMusicRecord({
      ownerId: userId,
      usage: body.usage ?? 'THEME_MUSIC',
      file,
    });
  }
}
