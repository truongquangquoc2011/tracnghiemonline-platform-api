import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  AnswerNotFoundException,
  CreateAnswerFailedException,
  UpdateAnswerFailedException,
  DeleteAnswerFailedException,
} from './answer.error'

@Injectable()
export class AnswerRepository {
  constructor(private readonly prismaService: PrismaService) {}

  // ================== CONFIG ==================
  private readonly CONFIG = {
    SELECT_ANSWER_FIELDS: {
      id: true,
      questionId: true,
      // Các field dưới đây bám theo schema bạn đang dùng (thấy xuất hiện trong log compile trước đó)
      text: true,
      isCorrect: true,
      shape: true,
      colorHex: true,
      orderIndex: true,
      //createdAt: true,
      //updatedAt: true,
    },
  }

  /**
   * Get all answers of a specific question (sorted by orderIndex ASC).
   */
  async listAnswers(questionId: string) {
    return this.prismaService.kahootAnswer.findMany({
      where: { questionId },
      orderBy: { orderIndex: 'asc' },
      select: this.CONFIG.SELECT_ANSWER_FIELDS,
    })
  }

  /**
   * Create a new answer for a question.
   */
  async createAnswer(
    questionId: string,
    data: Omit<Prisma.KahootAnswerCreateInput, 'question'>,
  ) {
    try {
      return await this.prismaService.kahootAnswer.create({
        data: {
          ...data,
          question: { connect: { id: questionId } },
        },
        select: this.CONFIG.SELECT_ANSWER_FIELDS,
      })
    } catch (error) {
      throw CreateAnswerFailedException
    }
  }

  /**
   * Update an existing answer by ID.
   */
  async updateAnswer(id: string, data: Prisma.KahootAnswerUpdateInput) {
    try {
      return await this.prismaService.kahootAnswer.update({
        where: { id },
        data,
        select: this.CONFIG.SELECT_ANSWER_FIELDS,
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw AnswerNotFoundException
      }
      throw UpdateAnswerFailedException
    }
  }

  /**
   * Delete an answer by ID.
   */
  async deleteAnswer(id: string) {
    try {
      return await this.prismaService.kahootAnswer.delete({
        where: { id },
        select: this.CONFIG.SELECT_ANSWER_FIELDS,
      })
    } catch (error) {
      if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
        throw AnswerNotFoundException
      }
      throw DeleteAnswerFailedException
    }
  }
}
