import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/shared/services/prisma.service';
import {
  ChallengeForbiddenException,
  ChallengeNotFoundException,
  ChallengeAlreadyClosedException,
  ChallengeTimeWindowException,
  StartAttemptFailedException,
  SubmitAnswerFailedException,
  SubmitAttemptFailedException,
  DuplicateAnswerException,
  KahootNotFoundOrPrivateException,
  ChallengeKahootMismatchException,
  CreateChallengeFailedException,
  OpenChallengeFailedException,
} from './challenge.error';
import { isUniqueConstraintPrismaError } from 'src/shared/helper';
import { Prisma, ChallengeStatus } from '@prisma/client';
import { randomInt } from 'crypto';

@Injectable()
export class ChallengeRepository {
  constructor(private readonly prisma: PrismaService) {}

  private generatePinCode(len = 7): string {
    // pin 7 chữ số (bạn có thể tăng lên 8 để càng khó trùng)
    let s = '';
    for (let i = 0; i < len; i++) s += randomInt(0, 10).toString();
    return s;
  }

  async assertKahootOwnerOrThrow(kahootId: string, userId: string): Promise<void> {
    const kahoot = await this.prisma.kahoot.findUnique({
      where: { id: kahootId },
      select: { ownerId: true, visibility: true },
    });
    if (!kahoot) {
      // dùng lại exception đang có
      throw KahootNotFoundOrPrivateException;
    }
    if (kahoot.ownerId !== userId) {
      throw ChallengeForbiddenException; // không phải owner thì không được tạo challenge trên kahoot đó
    }
  }
  /** ====== Challenge ====== */
  async checkViewableOrOwnerOrThrow(challengeId: string, userId?: string | null): Promise<void> {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
      select: {
        id: true,
        kahoot: { select: { ownerId: true, visibility: true } },
      },
    });
    if (!challenge) throw ChallengeNotFoundException;

    const { kahoot } = challenge;
    if (!kahoot) throw KahootNotFoundOrPrivateException;

    // Nếu là private -> chỉ owner xem
    if (kahoot.visibility === 'private' && kahoot.ownerId !== userId) {
      throw ChallengeForbiddenException;
    }
  }

  async assertOwnerOrThrow(challengeId: string, userId: string): Promise<void> {
    const found = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { kahoot: { select: { ownerId: true } } },
    });
    if (!found) throw ChallengeNotFoundException;
    if (found.kahoot.ownerId !== userId) throw ChallengeForbiddenException;
  }

  private parseOrder(sort: string, allow: string[], fallback: any) {
  const [field, dirRaw] = String(sort || '').split('.');
  const dir = dirRaw === 'asc' ? 'asc' : 'desc';
  if (!allow.includes(field)) return fallback;
  return { [field]: dir } as any;
}

  // A) LIST challenges (public/unlisted cho anonymous; +của user nếu có userId)
  async listChallenges(
    query: { page: number; limit: number; sort: string; kahoot_id?: string; status?: string; creator_id?: string },
    userId: string | null,
  ) {
    const { page, limit, sort, kahoot_id, status, creator_id } = query;

    const orderBy = this.parseOrder(
      sort,
      ['createdAt', 'updatedAt', 'startAt', 'dueAt', 'title', 'status'],
      { createdAt: 'desc' },
    );

    // baseFilter: anonymous chỉ xem public/unlisted; có userId thì thêm (creator = user) ∪ (owner = user)
    const baseFilter: Prisma.ChallengeWhereInput = userId
      ? {
          OR: [
            { kahoot: { visibility: { in: ['public', 'unlisted'] } } },
            { creatorId: userId },
            { kahoot: { ownerId: userId } },
          ],
        }
      : { kahoot: { visibility: { in: ['public', 'unlisted'] } } };

    // map string -> enum hợp lệ
    const normalizedStatus =
      status && ['draft', 'open', 'closed'].includes(status.toLowerCase())
        ? (status.toLowerCase() as ChallengeStatus)
        : undefined;

    const statusFilter: Prisma.EnumChallengeStatusFilter | undefined =
      normalizedStatus ? { equals: normalizedStatus } : undefined;

    // where cuối cùng
    const where: Prisma.ChallengeWhereInput = {
      ...baseFilter,
      ...(kahoot_id ? { kahootId: kahoot_id } : {}),
      ...(creator_id ? { creatorId: creator_id } : {}),
      ...(statusFilter ? { status: statusFilter } : {}),
    };

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.challenge.count({ where }),
      this.prisma.challenge.findMany({
        where,
        orderBy,
        skip: (page - 1) * limit,
        take: limit,
        select: {
          id: true, title: true, status: true, createdAt: true,
          kahoot:  { select: { title: true, visibility: true } },
          creator: { select: { firstName: true, lastName: true } },
        },
      }),
    ]);

    return { total, items: rows };
  }

  // B) LIST attempts (owner)
  async listAttempts(
    challengeId: string,
    query: { page: number; limit: number; sort: string },
  ) {
    const orderBy = this.parseOrder(
      query.sort,
      ['startedAt', 'submittedAt', 'scoreTotal', 'nickname'],
      { startedAt: 'desc' },
    );

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.challengeAttempt.count({ where: { challengeId } }),
      this.prisma.challengeAttempt.findMany({
        where: { challengeId },
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: {
          id: true, userId: true, nickname: true,
          startedAt: true, submittedAt: true, scoreTotal: true,
        },
      }),
    ]);
    return { page: query.page, limit: query.limit, total, items: rows };
  }

  // C) GET attempt detail (owner hoặc chính chủ)
  async getAttemptDetail(attemptId: string, userId: string | null) {
    const att = await this.prisma.challengeAttempt.findUnique({
      where: { id: attemptId },
      include: { challenge: { include: { kahoot: true } } },
    });
    if (!att) throw ChallengeNotFoundException;

    const isOwner = att.challenge.kahoot.ownerId === userId;
    const isSelf  = !!userId && att.userId === userId;

    if (!isOwner && !isSelf) {
      // nếu challenge public/unlisted thì vẫn cho xem,
      // private thì chỉ owner/ chính chủ attempt
      if (att.challenge.kahoot.visibility === 'private') throw ChallengeForbiddenException;
    }

    return {
      id: att.id,
      challengeId: att.challengeId,
      nickname: att.nickname,
      startedAt: att.startedAt,
      submittedAt: att.submittedAt,
      scoreTotal: att.scoreTotal,
    };
  }

  // D) LIST responses của 1 attempt (owner hoặc chính chủ)
  async listAttemptResponses(
    attemptId: string,
    query: { page: number; limit: number; sort: string },
    userId: string | null,
  ) {
    // re-use permission của getAttemptDetail
    await this.getAttemptDetail(attemptId, userId);

    const orderBy = this.parseOrder(
      query.sort,
      ['createdAt', 'timeTakenMs', 'pointsAwarded', 'basePoints'],
      { createdAt: 'asc' },
    );

    const [total, rows] = await this.prisma.$transaction([
      this.prisma.challengeResponse.count({ where: { attemptId } }),
      this.prisma.challengeResponse.findMany({
        where: { attemptId },
        orderBy,
        skip: (query.page - 1) * query.limit,
        take: query.limit,
        select: {
          id: true,
          questionId: true,
          answerId: true,
          isCorrect: true,
          timeTakenMs: true,
          basePoints: true,
          speedBonus: true,
          pointsAwarded: true,
          createdAt: true,
        },
      }),
    ]);

    return { page: query.page, limit: query.limit, total, items: rows };
  }

    /** ====== Create / Update ====== */
  async createChallenge(
    data: Prisma.ChallengeCreateInput,
  ): Promise<{ id: string; title: string; status: string; createdAt: Date }> {
    try {
      // 0) Lấy kahootId và chặn nếu đã có OPEN
      const kahootId = (data.kahoot as any)?.connect?.id as string | undefined;
      if (!kahootId) throw CreateChallengeFailedException;

      const existedOpen = await this.prisma.challenge.findFirst({
        where: { kahootId, status: 'open' },
        select: { id: true },
      });
      if (existedOpen) throw CreateChallengeFailedException;

      // 1) Thử tạo với pinCode ngẫu nhiên, nếu trùng thì retry
      const MAX_RETRY = 8;
      for (let i = 0; i < MAX_RETRY; i++) {
        const pinCode = this.generatePinCode(7); // 7–8 số sẽ ít trùng hơn

        try {
          const result = await this.prisma.challenge.create({
            data: { ...data, pinCode },
            select: { id: true, title: true, status: true, createdAt: true },
          });
          return result;
        } catch (error: any) {
          // Nếu là unique pinCode -> đổi mã và thử lại
          const isP2002 = error?.code === 'P2002';
          const target = error?.meta?.target;
          const isPinTarget =
            target === 'pinCode' ||
            (Array.isArray(target) && target.includes?.('pinCode')) ||
            String(error?.message || '').includes('pinCode');

          if (isP2002 && isPinTarget) {
            continue; // sinh lại mã và thử vòng kế
          }

          // Các unique khác (nếu có) -> giữ mapping như cũ
          if (error?.code === 'P2025') throw KahootNotFoundOrPrivateException;
          if (isUniqueConstraintPrismaError(error)) throw CreateChallengeFailedException;
          throw error;
        }
      }

      // Hết số lần thử mà vẫn trùng
      throw CreateChallengeFailedException;
    } catch (error: any) {
      if (error?.code === 'P2025') throw KahootNotFoundOrPrivateException;
      if (isUniqueConstraintPrismaError(error)) throw CreateChallengeFailedException;
      throw error;
    }
  }

  async updateChallenge(
    challengeId: string,
    data: Prisma.ChallengeUpdateInput,
  ): Promise<{ id: string; title: string; createdAt: Date }> {
    try {
      const result = await this.prisma.challenge.update({
        where: { id: challengeId },
        data,
        select: { id: true, title: true, createdAt: true },
      });
      return result;
    } catch (error: any) {
      if (error?.code === 'P2025') throw ChallengeNotFoundException;
      throw error;
    }
  }

  /** ====== Attempt ====== */
  async startAttempt(
    challengeId: string,
    userId: string | null,
    nickname: string,
  ): Promise<{
    attemptId: string;
    challengeId: string;
    kahootId: string;
    challengeTitle: string;
    startedAt: Date;
  }> {
    try {
      const challenge = await this.prisma.challenge.findUnique({
        where: { id: challengeId },
        include: { kahoot: true },
      });
      if (!challenge) throw ChallengeNotFoundException;

      if (challenge.status !== 'open') {
        throw ChallengeAlreadyClosedException;
      }
      // Nếu private => chỉ owner mới chơi
      if (challenge.kahoot.visibility === 'private' && challenge.kahoot.ownerId !== userId) {
        throw ChallengeForbiddenException;
      }

      // Kiểm tra thời gian
      const now = new Date();
      if (challenge.startAt && now < new Date(challenge.startAt))
        throw ChallengeTimeWindowException;
      if (challenge.dueAt && now > new Date(challenge.dueAt))
        throw ChallengeAlreadyClosedException;

      const attempt = await this.prisma.challengeAttempt.create({
        data: {
          challengeId,
          userId,
          nickname,
          startedAt: new Date(),
        },
        select: {
          id: true,
          challengeId: true,
          challenge: { select: { kahootId: true, title: true } },
          startedAt: true,
        },
      });

      return {
        attemptId: attempt.id,
        challengeId: attempt.challengeId,
        kahootId: attempt.challenge.kahootId,
        challengeTitle: attempt.challenge.title,
        startedAt: attempt.startedAt,
      };
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw StartAttemptFailedException;
      }
      throw error;
    }
  }

  async submitAnswer(
    attemptId: string,
    questionId: string,
    answerId: string | null,
    timeTakenMs: number,
  ): Promise<{ id: string }> {
    try {
      const attempt = await this.prisma.challengeAttempt.findUnique({
        where: { id: attemptId },
        select: { id: true, submittedAt: true },
      });
      if (!attempt) throw SubmitAnswerFailedException;
      if (attempt.submittedAt) throw ChallengeAlreadyClosedException;

      // 1) Lấy cấu hình câu hỏi để biết số điểm (pointsMultiplier)
      const q = await this.prisma.kahootQuestion.findUnique({
        where: { id: questionId },
        select: { pointsMultiplier: true },
      });
      if (!q) throw SubmitAnswerFailedException;

      // 2) Tính đúng/sai từ answer được chọn (nếu có)
      let isCorrect = false;
      if (answerId) {
        const ans = await this.prisma.kahootAnswer.findUnique({
          where: { id: answerId },
          // Lấy kèm questionId để đảm bảo đáp án thuộc đúng câu hỏi
          select: { isCorrect: true, questionId: true },
        });
        if (!ans) throw SubmitAnswerFailedException;
        if (ans.questionId !== questionId) {
          // đáp án không thuộc câu hỏi đang trả lời
          throw SubmitAnswerFailedException;
        }
        isCorrect = !!ans.isCorrect;
      }

      // 3) Điểm: đúng = pointsMultiplier (mặc định 1), sai = 0
      const basePoints = isCorrect ? (q.pointsMultiplier ?? 1) : 0;

      // (Tuỳ chọn) Bonus tốc độ – hiện để 0 cho ổn định
      const speedBonus = 0;
      const pointsAwarded = basePoints + speedBonus;

      // 4) Upsert response theo unique (attemptId, questionId)
      const response = await this.prisma.challengeResponse.upsert({
        where: { attemptId_questionId: { attemptId, questionId } },
        update: { answerId, timeTakenMs, isCorrect, basePoints, speedBonus, pointsAwarded },
        create: { attemptId, questionId, answerId, timeTakenMs, isCorrect, basePoints, speedBonus, pointsAwarded },
        select: { id: true },
      });

      return response;
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw DuplicateAnswerException;
      }
      throw error;
    }
  }

  async submitAttempt(
    attemptId: string,
  ): Promise<{ id: string; submittedAt: Date | null; scoreTotal: number }> {
    try {
      const attempt = await this.prisma.challengeAttempt.findUnique({
        where: { id: attemptId },
        include: {
          challenge: { include: { kahoot: true } },
          responses: { select: { pointsAwarded: true } },
        },
      });
      if (!attempt) throw ChallengeNotFoundException;
      if (attempt.submittedAt) throw SubmitAttemptFailedException;

      // Kiểm tra thời gian
      const now = new Date();
      if (attempt.challenge.dueAt && now > new Date(attempt.challenge.dueAt))
        throw ChallengeAlreadyClosedException;

      // Tổng điểm = sum(pointsAwarded) từ responses
      const scoreTotal = attempt.responses.reduce(
        (sum, r) => sum + (r.pointsAwarded ?? 0),
        0,
      );

      const result = await this.prisma.challengeAttempt.update({
        where: { id: attemptId },
        data: {
          submittedAt: new Date(),
          scoreTotal,
        },
        select: {
          id: true,
          submittedAt: true,
          scoreTotal: true,
        },
      });

      return result;
    } catch (error) {
      if (isUniqueConstraintPrismaError(error)) {
        throw SubmitAttemptFailedException;
      }
      throw error;
    }
  }

  /** ====== Utility: kiểm tra challenge thuộc kahoot ====== */
  async validateChallengeBelongsToKahoot(challengeId: string, kahootId: string): Promise<void> {
    const challenge = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { kahootId: true },
    });
    if (!challenge) throw ChallengeNotFoundException;
    if (challenge.kahootId !== kahootId) throw ChallengeKahootMismatchException;
  }

  async openChallenge(challengeId: string): Promise<{ id: string; status: string }> {
  // Lấy challenge + kahootId để kiểm tra trùng
  const cur = await this.prisma.challenge.findUnique({
    where: { id: challengeId },
    select: { id: true, status: true, kahootId: true },
  });
  if (!cur) throw ChallengeNotFoundException;

  // Nếu đã open thì thôi (tuỳ bạn chọn throw hay idempotent)
  if (cur.status === 'open') return { id: cur.id, status: cur.status };

  // Chỉ cho phép 1 challenge OPEN cho mỗi kahoot
  const existedOpen = await this.prisma.challenge.findFirst({
    where: { kahootId: cur.kahootId, status: 'open', NOT: { id: cur.id } },
    select: { id: true },
  });
  if (existedOpen) throw OpenChallengeFailedException;

  const updated = await this.prisma.challenge.update({
    where: { id: challengeId },
    data: { status: 'open' }, // có thể set startAt = new Date() nếu muốn
    select: { id: true, status: true },
  });
  return updated;
}

  async closeChallenge(challengeId: string): Promise<{ id: string; status: string }> {
    const cur = await this.prisma.challenge.findUnique({
      where: { id: challengeId },
      select: { id: true, status: true },
    });
    if (!cur) throw ChallengeNotFoundException;

    if (cur.status === 'closed') return { id: cur.id, status: cur.status };

    const updated = await this.prisma.challenge.update({
      where: { id: challengeId },
      data: { status: 'closed' }, // nếu muốn, set dueAt = new Date()
      select: { id: true, status: true },
    });
    return updated;
  }
}
