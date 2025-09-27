import { Injectable } from '@nestjs/common'
import { Prisma } from '@prisma/client'
import { PrismaService } from 'src/shared/services/prisma.service'
import {
  QuestionNotFoundException,
  CreateQuestionFailedException,
  UpdateQuestionFailedException,
  DeleteQuestionFailedException,
} from './question.error'

@Injectable()
export class QuestionRepository {
  constructor(private readonly prismaService: PrismaService) {}

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
  }

  async getById(id: string) {
    const doc = await this.prismaService.kahootQuestion.findUnique({
      where: { id },
      select: this.CONFIG.SELECT_QUESTION_FIELDS,
    })
    if (!doc || doc.deletedAt) throw QuestionNotFoundException
    return doc
  }

  async listQuestions(kahootId: string) {
    return this.prismaService.kahootQuestion.findMany({
      where: { kahootId },
      orderBy: { orderIndex: 'asc' },
      select: this.CONFIG.SELECT_QUESTION_FIELDS,
    })
  }

  async createQuestion(kahootId: string, data: Prisma.KahootQuestionCreateInput) {
    try {
      return await this.prismaService.$transaction(async (tx) => {
        const last = await tx.kahootQuestion.findFirst({
          where: { kahootId },
          orderBy: { orderIndex: 'desc' },
          select: { orderIndex: true },
        })

        const nextIndex = (last?.orderIndex ?? -1) + 1

        return tx.kahootQuestion.create({
          data: {
            // spread trước để tránh TS warn “overwritten”
            ...data,
            // quan hệ kahoot phải connect theo Prisma
            kahoot: { connect: { id: kahootId } },
            // set mặc định nếu chưa có trong data
            orderIndex: (data as any)?.orderIndex ?? nextIndex,
            timeLimit: (data as any)?.timeLimit ?? 60,
            pointsMultiplier: (data as any)?.pointsMultiplier ?? 1,
          },
          select: this.CONFIG.SELECT_QUESTION_FIELDS,
        })
      })
    } catch {
      throw CreateQuestionFailedException
    }
  }

  async updateQuestion(id: string, data: Prisma.KahootQuestionUpdateInput) {
    try {
      return await this.prismaService.kahootQuestion.update({
        where: { id },
        data,
        select: this.CONFIG.SELECT_QUESTION_FIELDS,
      })
    } catch {
      throw UpdateQuestionFailedException
    }
  }

  async deleteQuestion(id: string) {
    try {
      return await this.prismaService.kahootQuestion.update({
        where: { id },
        data: { deletedAt: new Date() },
        select: this.CONFIG.SELECT_QUESTION_FIELDS,
      })
    } catch {
      throw DeleteQuestionFailedException
    }
  }

  async reorderQuestions(kahootId: string, order: { id: string; orderIndex: number }[]) {
    try {
      return await this.prismaService.$transaction(
        order.map(({ id, orderIndex }) =>
          this.prismaService.kahootQuestion.update({
            where: { id },
            data: { orderIndex },
            select: this.CONFIG.SELECT_QUESTION_FIELDS,
          }),
        ),
      )
    } catch {
      throw UpdateQuestionFailedException
    }
  }
}
