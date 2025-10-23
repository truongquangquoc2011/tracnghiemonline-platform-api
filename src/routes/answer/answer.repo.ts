import { Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common'
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

  // Kiểm tra câu trả lời có thuộc id câu hỏi không
    async assertAnswerInQuestion(answerId: string, questionId: string) {
    const a = await this.prismaService.kahootAnswer.findFirst({
      where: { id: answerId,questionId },
      select: { id: true},
    });
  if (!a) {
    throw AnswerNotFoundException;
  }
  }

  // Load câu hỏi kèm kahoot để kiểm tra quyền
    async loadQuestionForGuard(questionId: string) {
    return this.prismaService.kahootQuestion.findUnique({
      where: { id: questionId },
      select: {
        id: true, kahootId: true, deletedAt: true,
        kahoot: { select: { id: true, ownerId: true, publishedAt: true, visibility: true } },
      },
    });
  }
  
  private readonly CONFIG = {
    SELECT_ANSWER_FIELDS: {
      id: true,
      questionId: true,
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
      });
    } catch (error) {
      // Bắt các lỗi Prisma phổ biến để trả message rõ
      if (error instanceof Prisma.PrismaClientKnownRequestError) {
        switch (error.code) {
          case 'P2002': // unique constraint failed
            // Nếu bạn có unique index (questionId, orderIndex) hoặc (questionId, text)
            throw new UnprocessableEntityException('Giá trị đã tồn tại (trùng unique constraint).');

          case 'P2003': // foreign key constraint failed
            // question không tồn tại/không connect được
            throw new NotFoundException('Câu hỏi không tồn tại hoặc không thể liên kết.');

          case 'P2025': // record to update not found (ít khi xảy ra với create)
            throw new NotFoundException('Không tìm thấy bản ghi để thao tác.');

          default:
            throw new UnprocessableEntityException(`Create answer failed (Prisma ${error.code}).`);
        }
      }
      // Unknown
      throw new UnprocessableEntityException('Create answer failed.');
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
