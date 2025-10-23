import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { QuestionRepository } from './question.repo';
import {
  QuestionNotFoundException,
} from './question.error';
import { PrismaService } from 'src/shared/services/prisma.service';
import { UserNotFoundException } from 'src/shared/constants/file-error.constant';

@Injectable()
export class QuestionService {
  constructor(
    private readonly repo: QuestionRepository,
    private readonly prisma: PrismaService,
  ) {}

  // Kiểm tra quyền xem kahoot (dùng cho listQuestions, getQuestion)
  private async assertKahootViewable(kahootId: string, userId?: string) {
    const k = await this.prisma.kahoot.findUnique({
      where: { id: kahootId },
      select: { id: true, ownerId: true, visibility: true },
    });
    if (!k) throw QuestionNotFoundException;

    if (k.visibility === 'private' && k.ownerId !== userId) {
      // Ẩn kahoot private với người ngoài
      throw QuestionNotFoundException;
    }
    return k;
  }

  async getQuestion(userId: string | undefined, kahootId: string, id: string) {
    const q = await this.prisma.kahootQuestion.findUnique({
      where: { id },
      select: this.repo['CONFIG'].SELECT_QUESTION_FIELDS,
    });
    if (!q || q.deletedAt) throw QuestionNotFoundException;

    if (q.kahootId !== kahootId) {
      throw new NotFoundException({ message: 'Error.QuestionNotInKahoot', path: 'questionId' });
    }
    // Check quyền xem theo visibility của chính kahoot đó
    await this.assertKahootViewable(kahootId, userId);
    return q;
  }

  // Thêm điều kiện kiểm tra Kahootid có tồn tại không
  async listQuestions(userId: string | undefined, kahootId: string) {
    await this.assertKahootViewable(kahootId, userId);
    return await this.repo.listQuestions(kahootId);
  }

  // Chuẩn nhất
  async createQuestion(userId: string, kahootId: string, data: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw UserNotFoundException;
    // Resolve từ Files nếu có
    const payload: any = { ...data };
    if (payload.imageFileId) {
      payload.imageUrl = await this.resolveFileIdToUrlOrThrow(payload.imageFileId, 'image');
      delete payload.imageFileId;
    }
    if (payload.videoFileId) {
      payload.videoUrl = await this.resolveFileIdToUrlOrThrow(payload.videoFileId, 'video');
      delete payload.videoFileId;
    }
    return await this.repo.createQuestion(kahootId, userId, payload);
  }

  async updateQuestion(userId: string, kahootId: string, id: string, data: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw UserNotFoundException;
    const payload: any = { ...data };
    if (payload.imageFileId) {
      payload.imageUrl = await this.resolveFileIdToUrlOrThrow(payload.imageFileId, 'image');
      delete payload.imageFileId;
    }
    if (payload.videoFileId) {
      payload.videoUrl = await this.resolveFileIdToUrlOrThrow(payload.videoFileId, 'video');
      delete payload.videoFileId;
    }

    return await this.repo.updateQuestion(kahootId, userId, id, payload);
  }

  async deleteQuestion(userId: string, kahootId: string, id: string) {
      const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw UserNotFoundException;
      return await this.repo.deleteQuestion(kahootId, userId, id);
  }

  async reorderQuestions(userId: string, kahootId: string, order: { id: string; orderIndex: number }[],) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw UserNotFoundException;
      return await this.repo.reorderQuestions(kahootId, userId, order);
  }

  private async resolveFileIdToUrlOrThrow(
    fileId: string,
    kind: 'image' | 'video'
  ): Promise<string> {
    const isObjId = /^[0-9a-f]{24}$/i.test(fileId);
    if (!isObjId) {
      throw new BadRequestException({ message: 'Invalid file id', path: kind });
    }

    // Base filter: file tồn tại & READY
    const baseWhere: any = {
      id: fileId,
      metaJson: { contains: '"status":"READY"' },
    };
    let file: { url: string } | null = null;

    if (kind === 'image') {
      // Ảnh: chỉ chấp nhận image/*
      file = await this.prisma.file.findFirst({
        where: { ...baseWhere, mime: { startsWith: 'image/' } },
        select: { url: true },
      });
    } else {
      // Video: ưu tiên video/*, nếu không có thì fallback audio/* (nhạc mp4)
      file = await this.prisma.file.findFirst({
        where: { ...baseWhere, mime: { startsWith: 'video/' } },
        select: { url: true },
      });

      if (!file) {
        file = await this.prisma.file.findFirst({
          where: { ...baseWhere, mime: { startsWith: 'audio/' } },
          select: { url: true },
        });
      }
    }

    if (!file) {
      throw new BadRequestException({
        message: `Thông báo lỗi! ${kind === 'image' ? 'Ảnh' : 'Video'} không tồn tại hoặc không hợp lệ`,
        path: kind === 'image' ? 'imageFileId' : 'videoFileId',
      });
    }

    return file.url;
  }
}