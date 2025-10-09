import { Module } from '@nestjs/common';
import { FilesService } from './file.service';
import { FilesController } from './file.controller';
import { FilesRepository } from './file.repo';
import { CloudinaryService } from 'src/shared/services/cloudinary.service';
import { AuthRepository } from '../auth/auth.repo';

@Module({
  controllers: [FilesController],
  providers: [FilesService,FilesRepository,CloudinaryService,AuthRepository],
})
export class FileModule {}
