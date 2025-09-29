import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from 'src/shared/services/prisma.service';
import {
  QuestionNotFoundException,
  CreateQuestionFailedException,
  UpdateQuestionFailedException,
  DeleteQuestionFailedException,
  ReorderQuestionFailedException,
} from './question.error';
import { isUniqueConstraintPrismaError } from 'src/shared/helper';

@Injectable()
export class QuestionRepository {
  constructor(private readonly prismaService: PrismaService) {}

  // Kiểm tra quyền sở hữu kahoot
  private async checkOwnershipOrThrow(kahootId: string, ownerId: string) {
    const kahoot = await this.prismaService.kahoot.findUnique({
      where: { id: kahootId },
      select: { id: true, ownerId: true },
    });

    if (!kahoot) {
      throw new NotFoundException({
        message: 'Error.KahootNotFound',
        path: 'kahoot',
      });
    }

    if (kahoot.ownerId !== ownerId) {
      throw new ForbiddenException({
        message: 'Error.Forbidden',
        path: 'ownerId',
      });
    }

    return kahoot;
  }

  // Kiểm tra câu hỏi có thuộc id kahoot không
  private async assertQuestionInKahoot(questionId: string, kahootId: string) {
    const q = await this.prismaService.kahootQuestion.findUnique({
      where: { id: questionId },
      select: { id: true, kahootId: true, deletedAt: true },
    });
    if (!q || q.kahootId !== kahootId || q.deletedAt) {
      throw new NotFoundException({
        message: 'Error.QuestionNotInKahoot',
        path: 'questionId',
      });
    }
  }

  private readonly CONFIG = {
    SELECT_QUESTION_FIELDS: {
      id: true,
      kahootId: true,
      text: true,
      imageUrl: true,
      videoUrl: true,
      orderIndex: true,
      timeLimit: true,
      pointsMultiplier: true,
      isMultipleSelect: true,
      deletedAt: true,
    },
  };

  async getById(id: string) {
    const doc = await this.prismaService.kahootQuestion.findUnique({
      where: { id },
      select: this.CONFIG.SELECT_QUESTION_FIELDS,
    });
    if (!doc || doc.deletedAt) throw QuestionNotFoundException;
    return doc;
  }

  async listQuestions(kahootId: string) {
     const rows = await this.prismaService.kahootQuestion.findMany({
      where: { kahootId},
      orderBy: { orderIndex: 'asc' },
      select: this.CONFIG.SELECT_QUESTION_FIELDS,
    });
    return rows.filter(r => !r.deletedAt);
  }


  // Chuẩn nhất 
  async createQuestion(
    kahootId: string,
    //--------
    ownerId: string,
    data: Prisma.KahootQuestionCreateInput,
  ) {
    try {
      await this.checkOwnershipOrThrow(kahootId, ownerId);

      return await this.prismaService.$transaction(async (tx) => {
        const last = await tx.kahootQuestion.findFirst({
          where: { kahootId },
          orderBy: { orderIndex: 'desc' },
          select: { orderIndex: true },
        });
        const nextIndex = (last?.orderIndex ?? -1) + 1;
        return tx.kahootQuestion.create({
          data: {
            ...data,
            kahoot: { connect: { id: kahootId } },
            orderIndex: nextIndex,
            timeLimit: 60,
            pointsMultiplier: 1,
            deletedAt: null, 
          },
          select: this.CONFIG.SELECT_QUESTION_FIELDS,
        });
      });
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw CreateQuestionFailedException;
      }
      throw error;
    }
  }

  async updateQuestion(
    kahootId: string,
    ownerId: string,
    id: string,
    data: Prisma.KahootQuestionUpdateInput,
  ) {
    try {
      await this.checkOwnershipOrThrow(kahootId, ownerId);
      await this.assertQuestionInKahoot(id, kahootId);

      return await this.prismaService.kahootQuestion.update({
        where: { id },
        data,
        select: this.CONFIG.SELECT_QUESTION_FIELDS,
      });
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw UpdateQuestionFailedException;
      }
      throw error;
    }
  }

  async deleteQuestion(
    kahootId: string, 
    ownerId: string, 
    id: string) {
    try {
      await this.checkOwnershipOrThrow(kahootId, ownerId);
      await this.assertQuestionInKahoot(id, kahootId); 

      return await this.prismaService.kahootQuestion.update({
        where: { id },
        data: { deletedAt: new Date() },
        select: this.CONFIG.SELECT_QUESTION_FIELDS,
      });
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw DeleteQuestionFailedException;
      }
      throw error;
    }
  }

  async reorderQuestions(
    kahootId: string,
    ownerId: string,
    order: { id: string; orderIndex: number }[],
  ) {
    try {
      await this.checkOwnershipOrThrow(kahootId, ownerId);

      // Kiểm tra tất cả câu hỏi có thuộc kahoot không
      const ids = order.map(o => o.id);
      const found = await this.prismaService.kahootQuestion.findMany({
        where: { kahootId, id: { in: ids }},
        select: { id: true },
      });
      if (found.length !== ids.length) {
        throw ReorderQuestionFailedException;
      }
      return await this.prismaService.$transaction(
        order.map(({ id, orderIndex }) =>
          this.prismaService.kahootQuestion.update({
            where: { id },
            data: { orderIndex },
            select: this.CONFIG.SELECT_QUESTION_FIELDS,
          }),
        ),
      );
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw ReorderQuestionFailedException;
      }
      throw error;
    }
  }
}