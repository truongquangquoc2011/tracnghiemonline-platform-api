import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
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
import { ChallengeStatus } from '@prisma/client';

import * as fs from 'fs';
import * as path from 'path';
// KHÔNG dùng import * as PDFDocument ...
import PDFDocument = require('pdfkit'); // cách an toàn cho TS + CJS
// shuffle ổn định theo seed (LCG đơn giản)
function seededShuffle<T>(items: T[], seed: string): T[] {
  let s = 0;
  for (let i = 0; i < seed.length; i++) s = (s * 31 + seed.charCodeAt(i)) >>> 0;
  const arr = items.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 1664525 + 1013904223) >>> 0;
    const j = s % (i + 1);
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

@Injectable()
export class ChallengeService {
  constructor(private readonly repo: ChallengeRepository) {}
   async getNextQuestionForAttempt(attemptId: string, userId: string | null) {
    const attempt = await this.repo.findAttemptWithChallengeAndQA(attemptId);
    if (!attempt) throw new NotFoundException('Attempt not found');

    // Quyền: owner hoặc chính người làm (nếu kahoot private)
    const isOwner =
      userId &&
      (attempt.challenge.kahoot.ownerId === userId ||
        attempt.challenge.creatorId === userId);
    const isSelf = userId && attempt.userId === userId;

    if (attempt.challenge.kahoot.visibility === 'private' && !(isOwner || isSelf)) {
      throw new ForbiddenException('You are not allowed to view this attempt');
    }

    // Trạng thái/time window
    const ch = attempt.challenge;
    if (ch.status !== ChallengeStatus.open) {
      throw new BadRequestException('Challenge is not open');
    }
    const now = new Date();
    if (ch.startAt && now < ch.startAt) {
      throw new BadRequestException('Challenge has not started yet');
    }
    if (ch.dueAt && now > ch.dueAt) {
      throw new BadRequestException('Challenge is already due');
    }

    // Thứ tự câu hỏi
    let questions = attempt.challenge.kahoot.questions.map(q => ({
      id: q.id,
      text: q.text,
      imageUrl: q.imageUrl,
      videoUrl: q.videoUrl,
      orderIndex: q.orderIndex ?? 0,
      timeLimit: q.timeLimit,
      pointsMultiplier: q.pointsMultiplier,
      isMultipleSelect: q.isMultipleSelect,
      answers: q.answers.map(a => ({
        id: a.id,
        text: a.text,
        shape: a.shape,
        colorHex: a.colorHex,
        orderIndex: a.orderIndex ?? 0,
      })),
    }));

    if (ch.questionOrderRandom) {
      questions = seededShuffle(questions, attemptId).map((q, i) => ({
        ...q,
        orderIndex: i,
      }));
    } else {
      questions.sort((a, b) => a.orderIndex - b.orderIndex);
    }

    // Lấy các question đã trả lời
    const answeredSet = new Set(
      (await this.repo.listAnsweredQuestionIds(attemptId)).map(x => x.questionId),
    );

    const answeredCount = answeredSet.size;
    const total = questions.length;

    // Tìm câu đầu tiên chưa trả lời
    const next = questions.find(q => !answeredSet.has(q.id));

    if (!next) {
      return {
        done: true,
        canSubmit: true,
        progress: { answered: answeredCount, total },
        message: 'All questions answered. You can submit now.',
      };
    }

    // Random answers nếu cần, ổn định theo attemptId:questionId
    let answers = next.answers.slice();
    if (ch.answerOrderRandom) {
      answers = seededShuffle(answers, `${attemptId}:${next.id}`).map((a, i) => ({
        ...a,
        orderIndex: i,
      }));
    } else {
      answers.sort((a, b) => a.orderIndex - b.orderIndex);
    }

    return {
      done: false,
      progress: { index: answeredCount + 1, total }, // ví dụ câu số 2/10
      question: {
        id: next.id,
        text: next.text,
        imageUrl: next.imageUrl,
        videoUrl: next.videoUrl,
        timeLimit: next.timeLimit,
        pointsMultiplier: next.pointsMultiplier,
        isMultipleSelect: next.isMultipleSelect,
        answers, // không có isCorrect
      },
    };
  }

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

  /** ===========================
   *  LEADERBOARD (JSON)
   *  =========================== */
  async listLeaderboard(challengeId: string, query: any, userId: string) {
    const page  = Math.max(1, Number(query.page)  || 1);
    const limit = Math.min(1000, Math.max(1, Number(query.limit) || 100));
    const sort  = String(query.sort || 'scoreTotal.desc');

    // Chỉ owner xem toàn bảng điểm
    await this.repo.assertOwnerOrThrow(challengeId, userId);
    return await this.repo.listLeaderboard(challengeId, { page, limit, sort });
  }

    /** ===========================
     *  LEADERBOARD → PDF
     *  =========================== */
  async exportLeaderboardPdf(
    challengeId: string,
    query: any,
    userId: string,
    res: any,
  ) {
    // 0) Data + meta
    const data = await this.listLeaderboard(challengeId, query, userId);
    const meta = await this.repo['prisma'].challenge.findUnique({
      where: { id: challengeId },
      select: { title: true, pinCode: true },
    });

    // 1) PDF to Buffer (tránh write-after-end)
    const doc = new PDFDocument({ size: 'A4', margin: 36 });

    const chunks: Buffer[] = [];
    doc.on('data', (chunk: Buffer) => chunks.push(chunk));
    doc.on('error', () => {
      try { res.status(500).json({ message: 'PDF render failed' }); } catch {}
    });
    doc.on('end', () => {
      const pdfBuffer = Buffer.concat(chunks);
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Length', String(pdfBuffer.length));
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="leaderboard-${challengeId}.pdf"`,
      );
      res.end(pdfBuffer);
    });

    // 2) Fonts
    const fontPath = path.join(process.cwd(), 'assets', 'fonts', 'NotoSans-Regular.ttf');
    const monoPath = path.join(process.cwd(), 'assets', 'fonts', 'NotoSansMono-Regular.ttf');
    const hasMain = fs.existsSync(fontPath);
    const hasMono = fs.existsSync(monoPath);

    if (hasMain) doc.font(fontPath); else doc.font('Helvetica');

    // 3) Header
    const printableTitle = meta?.title || `Challenge ${challengeId}`;
    const printablePIN = meta?.pinCode ? `Mã PIN: ${meta.pinCode}` : '';
    doc.fontSize(18).text(`Bảng xếp hạng - ${printableTitle}`, { underline: true });
    if (printablePIN) doc.moveDown(0.1).fontSize(12).fillOpacity(0.7).text(printablePIN);
    doc.fillOpacity(1);

    doc.moveDown(0.5);
    doc.fontSize(10).text(`Xuất lúc: ${new Date().toLocaleString()}`);
    doc.text(`Trang: ${data.page} • Giới hạn: ${data.limit} • Tổng lượt tham gia: ${data.total}`);
    doc.moveDown(0.6);

    // 4) Table layout (cột cố định, canh phải số, zebra rows, tự addPage)
    const PAGE_W = 595.28;
    const TOP = 36, BOT = 36, LEFT = 36, RIGHT = PAGE_W - 36;
    const CONTENT_MAX_Y = 842 - BOT;

    // Cột (cố định Submitted rộng để không xuống dòng, kéo Score lệch trái)
    const COL_NO_X = LEFT,  COL_NO_W = 35;

    // khoảng cách giữa các cột
    const GAP_NO_NICK = 10;
    const GAP_NICK_SCORE = 16;
    const GAP_SCORE_SUBMIT = 40;

    // 1) Cột Submitted: đặt cố định ở PHÍA PHẢI với width lớn để không wrap
    const COL_SUBMIT_W = 170;
    const COL_SUBMIT_X = RIGHT - COL_SUBMIT_W;

    // 2) Cột Score: lùi sang trái 1 khoảng GAP_SCORE_SUBMIT so với Submitted
    const COL_SCORE_W = 50;
    const COL_SCORE_X = COL_SUBMIT_X - GAP_SCORE_SUBMIT - COL_SCORE_W;

    // 3) Cột Nickname: chiếm phần còn lại giữa No. và Score
    const COL_NICK_X = COL_NO_X + COL_NO_W + GAP_NO_NICK;
    const COL_NICK_W = COL_SCORE_X - GAP_NICK_SCORE - COL_NICK_X;

    const BASE_FONT = 11;
    const HEADER_FONT = 12;
    const ROW_GAP = 6;
    const MIN_ROW_H = 18;

    let y = doc.y;

    const renderHeaderRow = () => {
      doc.fontSize(HEADER_FONT);
      doc.text('STT',         COL_NO_X,     y, { width: COL_NO_W,    align: 'center'  });
      doc.text('Biệt danh',    COL_NICK_X,   y, { width: COL_NICK_W,  align: 'center'  });
      doc.text('Điểm số',       COL_SCORE_X,  y, { width: COL_SCORE_W, align: 'center' });
      doc.text('Thời gian nộp bài',COL_SUBMIT_X, y, { width: COL_SUBMIT_W,align: 'center' });

      // kẻ dưới header
      const h = Math.max(
        doc.heightOfString('STT', { width: COL_NO_W }),
        doc.heightOfString('Biệt danh', { width: COL_NICK_W }),
        doc.heightOfString('Điểm số', { width: COL_SCORE_W }),
        doc.heightOfString('Thời gian nộp bài', { width: COL_SUBMIT_W }),
      );
      y += h + 4;
      doc.moveTo(LEFT, y).lineTo(RIGHT, y).stroke();
      y += 4;
      doc.fontSize(BASE_FONT);
    };

    const ensurePage = (neededH: number, drawHeader = true) => {
      if (y + neededH > CONTENT_MAX_Y) {
        doc.addPage();
        y = TOP;
        if (drawHeader) renderHeaderRow();
      }
    };

    // In header bảng lần đầu
    renderHeaderRow();

    const drawRow = (row: any, idx: number) => {
      const nick = row.nickname ?? '(guest)';
      const submitted = row.submittedAt ? new Date(row.submittedAt).toLocaleString() : '-';
      const scoreStr = String(row.scoreTotal ?? 0);
      const noStr = String(row.rank);

      // Tính chiều cao dòng theo nội dung dài nhất
      const hNo     = doc.heightOfString(noStr,      { width: COL_NO_W });
      const hNick   = doc.heightOfString(nick,       { width: COL_NICK_W });
      const hScore  = doc.heightOfString(scoreStr,   { width: COL_SCORE_W });
      const hSubmit = doc.heightOfString(submitted,  { width: COL_SUBMIT_W });
      const rowH = Math.max(MIN_ROW_H, hNo, hNick, hScore, hSubmit);

      // Nếu sắp tràn trang → addPage + in lại header
      ensurePage(rowH + ROW_GAP);

      // Zebra background (hàng chẵn)
      if (idx % 2 === 1) {
        doc.save().rect(LEFT, y - 2, RIGHT - LEFT, rowH + 4).fillOpacity(0.04).fill('#000').restore();
      }

      // In từng ô tại toạ độ cố định
      doc.fillColor('black');
      doc.text(noStr,     COL_NO_X,     y, { width: COL_NO_W,    align: 'center'  });
      doc.text(nick,      COL_NICK_X,   y, { width: COL_NICK_W,  align: 'center'  });

      // Số dùng font mono nếu có → rất thẳng hàng
      if (hasMono) doc.font(monoPath);
      doc.text(scoreStr,  COL_SCORE_X,  y, { width: COL_SCORE_W, align: 'center' });
      if (hasMain) doc.font(fontPath); else doc.font('Helvetica');

      doc.text(submitted, COL_SUBMIT_X, y, { width: COL_SUBMIT_W, align: 'center' });

      y += rowH + ROW_GAP;
    };

    data.items.forEach((row: any, idx: number) => drawRow(row, idx));

    // 5) Footer nhẹ (tùy chọn)
    ensurePage(24, false);
    doc.moveDown(0.5).fontSize(9).fillOpacity(0.7)
      .text(`Challenge ID: ${challengeId}`, LEFT, y)
      .fillOpacity(1);

    doc.end();
  }
}
