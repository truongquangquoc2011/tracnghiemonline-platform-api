// giữ như cũ
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/shared/services/prisma.service';

type CreateFileData = {
  ownerId: string;
  url: string;
  mime: string;
  size: number;
  metaJson?: string | null;
};

@Injectable()
export class FilesRepository {
  constructor(private readonly prisma: PrismaService) {}

  create(data: CreateFileData) {
    return this.prisma.file.create({ data });
  }
}
