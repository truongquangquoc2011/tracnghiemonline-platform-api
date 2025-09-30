import { Injectable, NotFoundException } from '@nestjs/common';
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
    return await this.repo.createQuestion(kahootId, userId, data);
  }

  async updateQuestion(userId: string, kahootId: string, id: string, data: any) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw UserNotFoundException;
      return await this.repo.updateQuestion(kahootId, userId, id, data);
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
}