import { Injectable } from '@nestjs/common';
import { AnswerRepository } from './answer.repo';

@Injectable()
export class AnswerService {
    constructor(private readonly repo: AnswerRepository) {}
  listAnswers(actorId: string, questionId: string) {
    return this.repo.listAnswers(questionId)
  }

  createAnswer(actorId: string, questionId: string, data: any) {
    return this.repo.createAnswer(questionId, data)
  }

  updateAnswer(actorId: string, id: string, data: any) {
    return this.repo.updateAnswer(id, data)
  }

  deleteAnswer(actorId: string, id: string) {
    return this.repo.deleteAnswer(id)
  }
}
