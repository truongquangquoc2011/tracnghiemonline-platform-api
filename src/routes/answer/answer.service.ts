import { AnswerShape } from '@prisma/client';
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { AnswerRepository } from './answer.repo';
import {
  CreateAnswerFailedException,
  UpdateAnswerFailedException,
  DeleteAnswerFailedException,
  AnswerNotFoundException,
} from './answer.error';
import { PrismaService } from 'src/shared/services/prisma.service';
import { UserNotFoundException } from 'src/shared/constants/file-error.constant';
import { validateAnswerLimitAndDuplicate } from 'src/shared/utils/answer.validation';
@Injectable()
export class AnswerService {
  constructor(
    private readonly repo: AnswerRepository,
    private readonly prisma: PrismaService,
  ) {}

  private async getGuardMeta(kahootId: string, questionId: string) {
    const q = await this.repo.loadQuestionForGuard(questionId);
    if (!q || q.deletedAt || q.kahootId !== kahootId)
      throw AnswerNotFoundException;
    return q;
  }

  // Kiểm tra quyền sở hữu owner
  private ensureOwner(userId: string, ownerId: string) {
    if (userId !== ownerId) throw AnswerNotFoundException;
  }

  // Lấy danh sách câu trả lời của câu hỏi
  async listAnswers(userId: string, kahootId: string, questionId: string) {
    try {
      const q = await this.getGuardMeta(kahootId, questionId);
      // private: chỉ owner xem; public/unlisted: ai cũng xem
      if (q.kahoot.visibility === 'private' && q.kahoot.ownerId !== userId) {
        throw AnswerNotFoundException;
      }
      return await this.repo.listAnswers(questionId);
    } catch {
      throw AnswerNotFoundException;
    }
  }

  // Thêm câu trả lời
  async createAnswer(
    userId: string,
    kahootId: string,
    questionId: string,
    data: any,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw UserNotFoundException;

    const q = await this.getGuardMeta(kahootId, questionId);
    this.ensureOwner(userId, q.kahoot.ownerId);
    if (q.kahoot.publishedAt) throw CreateAnswerFailedException;

    //  Gọi hàm validate logic nghiệp vụ
    await validateAnswerLimitAndDuplicate(
      this.prisma,
      questionId,
      data.orderIndex,
      data.shape
    );

    //  Tạo
    return await this.repo.createAnswer(questionId, data);
  }

  // Cập nhật câu trả lời
  async updateAnswer(
    userId: string,
    kahootId: string,
    questionId: string,
    id: string,
    data: any,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw UserNotFoundException;

    const q = await this.getGuardMeta(kahootId, questionId);
    this.ensureOwner(userId, q.kahoot.ownerId);
    if (q.kahoot.publishedAt) throw UpdateAnswerFailedException;

    await this.repo.assertAnswerInQuestion(id, questionId);
    return await this.repo.updateAnswer(id, data);
  }

  // Xoá câu trả lời
  async deleteAnswer(
    userId: string,
    kahootId: string,
    questionId: string,
    id: string,
  ) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) throw UserNotFoundException;

    const q = await this.getGuardMeta(kahootId, questionId);
    this.ensureOwner(userId, q.kahoot.ownerId);
    if (q.kahoot.publishedAt) throw DeleteAnswerFailedException;

    await this.repo.assertAnswerInQuestion(id, questionId);
    return await this.repo.deleteAnswer(id);
  }
}
