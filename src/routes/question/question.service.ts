import { Injectable } from '@nestjs/common'
import { QuestionRepository } from './question.repo'
import {
  QuestionNotFoundException,
  CreateQuestionFailedException,
  UpdateQuestionFailedException,
  DeleteQuestionFailedException,
  ReorderQuestionFailedException,
} from './question.error'

@Injectable()
export class QuestionService {
  constructor(private readonly repo: QuestionRepository) {}

  /**
   * Lấy 1 câu hỏi theo id
   */
  async getQuestion(id: string) {
    try {
      return await this.repo.getById(id)
    } catch {
      throw QuestionNotFoundException
    }
  }

  /**
   * Lấy danh sách câu hỏi của 1 kahoot
   */
  async listQuestions(kahootId: string) {
    try {
      return await this.repo.listQuestions(kahootId)
    } catch {
      throw QuestionNotFoundException
    }
  }

  /**
   * Tạo mới câu hỏi
   */
  async createQuestion(actorId: string, kahootId: string, data: any) {
    try {
      return await this.repo.createQuestion(kahootId, data)
    } catch {
      throw CreateQuestionFailedException
    }
  }

  /**
   * Cập nhật câu hỏi
   */
  async updateQuestion(actorId: string, id: string, data: any) {
    try {
      return await this.repo.updateQuestion(id, data)
    } catch {
      throw UpdateQuestionFailedException
    }
  }

  /**
   * Xoá câu hỏi (soft delete)
   */
  async deleteQuestion(actorId: string, id: string) {
    try {
      return await this.repo.deleteQuestion(id)
    } catch {
      throw DeleteQuestionFailedException
    }
  }

  /**
   * Reorder lại toàn bộ câu hỏi của kahoot
   */
  async reorderQuestions(actorId: string, kahootId: string, order: { id: string; orderIndex: number }[]) {
    try {
      return await this.repo.reorderQuestions(kahootId, order)
    } catch {
      throw ReorderQuestionFailedException
    }
  }
}
