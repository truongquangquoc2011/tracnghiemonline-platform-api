import { ForbiddenException, Injectable } from '@nestjs/common';
import { ChallengeRepository } from './challenge.repo';
import {
  CreateChallengeBodyDTO,
  UpdateChallengeBodyDTO,
  StartAttemptBodyDTO,
  SubmitAnswerBodyDTO,
} from './dto/challenge.dto';
import {
  ChallengeNotFoundException,
  ChallengeForbiddenException,
  CreateChallengeFailedException,
  UpdateChallengeFailedException,
  StartAttemptFailedException,
  SubmitAnswerFailedException,
  SubmitAttemptFailedException,
} from './challenge.error';
import { isUniqueConstraintPrismaError } from 'src/shared/helper';

@Injectable()
export class ChallengeService {
  constructor(private readonly repo: ChallengeRepository) {}
  // ChallengeService

// A) LIST challenges
async listChallenges(query: any, userId: string | null) {
  const page  = Math.max(1, Number(query.page)  || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const sort  = String(query.sort || 'createdAt.desc');

  const result = await this.repo.listChallenges({ ...query, page, limit, sort }, userId);
  return {
    page, limit,
    total: result.total,
    items: result.items,
  };
}

// B) LIST attempts (owner)
async listAttempts(challengeId: string, query: any, userId: string) {
  const page  = Math.max(1, Number(query.page)  || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const sort  = String(query.sort || 'startedAt.desc');

  await this.repo.assertOwnerOrThrow(challengeId, userId);
  return await this.repo.listAttempts(challengeId, { page, limit, sort });
}

// C) GET attempt detail (owner hoặc chính chủ attempt)
async getAttemptDetail(attemptId: string, userId: string | null) {
  return await this.repo.getAttemptDetail(attemptId, userId);
}

// D) LIST responses (owner hoặc chính chủ attempt)
async listAttemptResponses(attemptId: string, query: any, userId: string | null) {
  const page  = Math.max(1, Number(query.page)  || 1);
  const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
  const sort  = String(query.sort || 'createdAt.asc');

  return await this.repo.listAttemptResponses(attemptId, { page, limit, sort }, userId);
}

  async openChallenge(id: string, userId: string) {
    await this.repo.assertOwnerOrThrow(id, userId);
    const result = await this.repo.openChallenge(id);
    return { message: 'Đã mở challenge', challenge: result };
  }

  async closeChallenge(id: string, userId: string) {
    await this.repo.assertOwnerOrThrow(id, userId);
    const result = await this.repo.closeChallenge(id);
    return { message: 'Đã đóng challenge', challenge: result };
  }

  /** ===========================
   *  CREATE
   *  =========================== */
  async createChallenge(body: CreateChallengeBodyDTO, userId: string) {
  // 1) user phải tồn tại
  const user = await this.repo['prisma'].user.findUnique({ where: { id: userId } });
  if (!user) {
    // chặn sớm: token hợp lệ nhưng user không tồn tại trong DB
    throw new ForbiddenException({ message: 'User không tồn tại', path: 'user' });
  }

  // 2) kahoot thuộc owner
  await this.repo.assertKahootOwnerOrThrow(body.kahoot_id, userId);  // :contentReference[oaicite:4]{index=4}

  // 3) tạo challenge
  const created = await this.repo.createChallenge({
    kahoot:  { connect: { id: body.kahoot_id } },
    creator: { connect: { id: userId } },
    title: body.title,
    introText: body.intro_text,
    startAt: body.start_at ? new Date(body.start_at) : null,
    dueAt:   body.due_at   ? new Date(body.due_at)   : null,
    status:  body.status ?? 'open',
    answerOrderRandom:   body.answer_order_random,
    questionOrderRandom: body.question_order_random,
    streaksEnabled:      body.streaks_enabled,
  });

  return { id: created.id, title: created.title, status: created.status, createdAt: created.createdAt };
}

  /** ===========================
   *  UPDATE
   *  =========================== */
  async updateChallenge(id: string, body: UpdateChallengeBodyDTO, userId: string): Promise<any> {
    try {
      await this.repo.assertOwnerOrThrow(id, userId);

      const updated = await this.repo.updateChallenge(id, {
        title: body.title,
        introText: body.intro_text,
        startAt: body.start_at ? new Date(body.start_at) : undefined,
        dueAt: body.due_at ? new Date(body.due_at) : undefined,
        status: body.status,
        answerOrderRandom: body.answer_order_random,
        questionOrderRandom: body.question_order_random,
        streaksEnabled: body.streaks_enabled,
      });

      return {
        id: updated.id,
        title: updated.title,
        updatedAt: updated.createdAt,
      };
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw UpdateChallengeFailedException;
      }
      throw error;
    }
  }

  /** ===========================
   *  START ATTEMPT
   *  =========================== */
  async startAttempt(
    challengeId: string,
    body: StartAttemptBodyDTO,
    userId?: string | null,
  ): Promise<any> {
    try {
      const { nickname } = body;
      const attempt = await this.repo.startAttempt(challengeId, userId ?? null, nickname);
      return {
        message: 'Bắt đầu challenge thành công',
        attempt,
      };
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw StartAttemptFailedException;
      }
      throw error;
    }
  }

  /** ===========================
   *  SUBMIT ANSWER
   *  =========================== */
  async submitAnswer(
    attemptId: string,
    body: SubmitAnswerBodyDTO,
  ): Promise<any> {
    try {
      const { question_id, answer_id, time_taken_ms } = body;
      const result = await this.repo.submitAnswer(
        attemptId,
        question_id,
        answer_id ?? null,
        time_taken_ms,
      );
      return {
        message: 'Gửi câu trả lời thành công',
        responseId: result.id,
      };
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw SubmitAnswerFailedException;
      }
      throw error;
    }
  }

  /** ===========================
   *  SUBMIT ATTEMPT
   *  =========================== */
  async submitAttempt(attemptId: string): Promise<any> {
    try {
      const result = await this.repo.submitAttempt(attemptId);
      return {
        message: 'Nộp bài thành công',
        attempt: result,
      };
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw SubmitAttemptFailedException;
      }
      throw error;
    }
  }

  /** ===========================
   *  GET CHALLENGE DETAIL
   *  =========================== */
  async getChallengeDetail(challengeId: string, userId?: string | null): Promise<any> {
    try {
      await this.repo.checkViewableOrOwnerOrThrow(challengeId, userId);

      const challenge = await this.repo['prisma'].challenge.findUnique({
        where: { id: challengeId },
        include: {
          kahoot: { select: { title: true, visibility: true } },
          creator: { select: { firstName: true, lastName: true } },
        },
      });

      if (!challenge) throw ChallengeNotFoundException;

      return {
        id: challenge.id,
        title: challenge.title,
        kahoot: challenge.kahoot,
        creator: challenge.creator,
        startAt: challenge.startAt,
        dueAt: challenge.dueAt,
        status: challenge.status,
      };
    } catch (error) {
      throw error;
    }
  }

  /** ===========================
   *  DELETE (soft)
   *  =========================== */
  async deleteChallenge(id: string, userId: string): Promise<void> {
    try {
      await this.repo.assertOwnerOrThrow(id, userId);
      await this.repo['prisma'].challenge.delete({ where: { id } });
    } catch (error) {
      if (error.code === 'P2025') throw ChallengeNotFoundException;
      throw error;
    }
  }
}
