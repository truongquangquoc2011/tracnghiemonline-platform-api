import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/shared/services/prisma.service';
export type CreatePlayerInput = {
  sessionId: string;
  nickname: string;
  userId?: string | null;
  teamId?: string | null;
  clientKey?: string | null;
};
type LobbyStatus = 'waiting' | 'running' | 'ended';
@Injectable()
export class LobbyRepository {
  constructor(private readonly prisma: PrismaService) {}

  /* ========= Players ========= */

  async findPlayerById(playerId: string) {
    return this.prisma.lobbyPlayer.findUnique({
      where: { id: playerId },
    });
  }
  async findActivePlayerBySessionAndUser(sessionId: string, userId: string) {
    return this.prisma.lobbyPlayer.findFirst({
      where: {
        sessionId,
        userId,
        isKicked: false,
        leftAt: null,
      },
      orderBy: { joinedAt: 'desc' },
    });
  }
  async findActivePlayerBySessionAndClientKey(
    sessionId: string,
    clientKey: string,
  ) {
    return this.prisma.lobbyPlayer.findFirst({
      where: {
        sessionId,
        clientKey,
        isKicked: false,
        leftAt: null,
      },
      orderBy: { joinedAt: 'desc' },
    });
  }
  async createPlayer(input: CreatePlayerInput) {
    return this.prisma.lobbyPlayer.create({
      data: {
        sessionId: input.sessionId,
        nickname: input.nickname,
        userId: input.userId ?? null,
        teamId: input.teamId ?? null,
        clientKey: input.clientKey ?? null,
        isKicked: false,
        joinedAt: new Date(),
        leftAt: null,
      },
    });
  }
  /* ========= Optional helpers you may already have ========= */

  async markPlayerLeft(sessionId: string, playerId: string) {
    return this.prisma.lobbyPlayer.update({
      where: { id: playerId },
      data: { leftAt: new Date() },
    });
  }

  /* ---------------------------------- UTILS ---------------------------------- */

  /** Generate random 6-digit PIN (and ensure it's unique). */
  private async generateUniquePin(): Promise<string> {
    for (let i = 0; i < 5; i++) {
      const pin = Math.floor(100000 + Math.random() * 900000).toString();
      const existed = await this.prisma.lobbySession.findUnique({
        where: { pinCode: pin },
      });
      if (!existed) return pin;
    }
    return Math.floor(1000000 + Math.random() * 9000000).toString();
  }

  /* -------------------------------- CREATE / READ -------------------------------- */

  async createLobby(
    kahootId: string,
    hostId: string,
    data: {
      mode: 'classic' | 'team';
      answerOrderRandom: boolean;
      questionOrderRandom: boolean;
      streaksEnabled: boolean;
      nicknameGenerator: boolean;
      settingsJson?: string;
    },
  ) {
    if (!hostId) throw new Error('Host ID missing.');
    const pinCode = await this.generateUniquePin();

    return this.prisma.lobbySession.create({
      data: {
        kahootId,
        hostId,
        pinCode,
        mode: data.mode,
        status: 'waiting',
        answerOrderRandom: data.answerOrderRandom,
        questionOrderRandom: data.questionOrderRandom,
        streaksEnabled: data.streaksEnabled,
        nicknameGenerator: data.nicknameGenerator,
        settingsJson: data.settingsJson,
      },
    });
  }

  findById(sessionId: string) {
    return this.prisma.lobbySession.findUnique({
      where: { id: sessionId },
    });
  }

  // Cập nhật có điều kiện: chỉ chuyển sang 'running' khi hiện tại đang 'waiting'
  async setStatusIfWaiting(
    sessionId: string,
    status: Exclude<LobbyStatus, 'waiting'>,
  ): Promise<boolean> {
    const data: any = { status };
    if (status === 'running') data.startedAt = new Date();
    if (status === 'ended') data.endedAt = new Date();

    const res = await this.prisma.lobbySession.updateMany({
      where: { id: sessionId, status: 'waiting' },
      data,
    });
    return res.count > 0;
  }

  findByPin(pinCode: string) {
    return this.prisma.lobbySession.findUnique({ where: { pinCode } });
  }

  async findByHost(hostId: string) {
    return this.prisma.lobbySession.findMany({
      where: { hostId },
      orderBy: { createdAt: 'desc' },
    });
  }

  /* -------------------------------- PLAYER MANAGEMENT -------------------------------- */

  async addPlayer(
    sessionId: string,
    payload: {
      nickname: string;
      userId?: string | null;
      teamId?: string | null;
    },
  ) {
    const same = await this.prisma.lobbyPlayer.findFirst({
      where: {
        sessionId,
        nickname: payload.nickname,
        leftAt: null,
        isKicked: false,
      },
    });
    if (same) throw new Error('Nickname already taken in this lobby.');

    return this.prisma.lobbyPlayer.create({
      data: {
        sessionId,
        teamId: payload.teamId || null,
        userId: payload.userId || null,
        nickname: payload.nickname,
        isKicked: false,
        joinedAt: new Date(),
        streakCurrent: 0,
        streakMax: 0,
      },
    });
  }

  async leavePlayer(sessionId: string, playerId: string) {
    return this.prisma.lobbyPlayer.update({
      where: { id: playerId },
      data: { leftAt: new Date() },
    });
  }

  async kickPlayer(sessionId: string, playerId: string) {
    return this.prisma.lobbyPlayer.update({
      where: { id: playerId },
      data: { isKicked: true, leftAt: new Date() },
    });
  }

  /* -------------------------------- STATUS / CONTROL -------------------------------- */

  // Nếu vẫn cần hàm setStatus "tự do", giữ riêng (cẩn thận race condition)
  async setStatus(sessionId: string, status: LobbyStatus) {
    const data: any = { status };
    if (status === 'running') data.startedAt = new Date();
    if (status === 'ended') data.endedAt = new Date();

    return this.prisma.lobbySession.update({
      where: { id: sessionId },
      data,
    });
  }

  /* -------------------------------- QUESTIONS -------------------------------- */

  async getQuestionByIndex(kahootId: string, index: number) {
    const question = await this.prisma.kahootQuestion.findFirst({
      where: { kahootId },
      orderBy: { orderIndex: 'asc' },
      skip: index,
      take: 1,
    });
    return question;
  }

  getQuestionById(questionId: string) {
    return this.prisma.kahootQuestion.findUnique({
      where: { id: questionId },
    });
  }

  getAnswer(answerId: string) {
    return this.prisma.kahootAnswer.findUnique({
      where: { id: answerId },
    });
  }

  getAnswersForQuestion(questionId: string) {
    return this.prisma.kahootAnswer.findMany({
      where: { questionId },
      orderBy: { orderIndex: 'asc' },
    });
  }

  /* -------------------------------- RESPONSES -------------------------------- */

  async upsertResponse(data: {
    sessionId: string;
    playerId: string;
    questionId: string;
    answerId: string | null;
    isCorrect: boolean;
    timeTakenMs: number;
    basePoints: number;
    speedBonus: number;
    pointsAwarded: number;
  }) {
    const existed = await this.prisma.lobbyPlayerResponse.findFirst({
      where: {
        sessionId: data.sessionId,
        playerId: data.playerId,
        questionId: data.questionId,
      },
    });

    if (existed) {
      return this.prisma.lobbyPlayerResponse.update({
        where: { id: existed.id },
        data,
      });
    }

    return this.prisma.lobbyPlayerResponse.create({ data });
  }

  async bumpPlayerStats(playerId: string, isCorrect: boolean, points: number) {
    const player = await this.prisma.lobbyPlayer.findUnique({
      where: { id: playerId },
    });
    if (!player) return null;

    const newStreak = isCorrect ? player.streakCurrent + 1 : 0;
    const newStreakMax = Math.max(player.streakMax || 0, newStreak);
    const newScore = (player.finalScore || 0) + (points || 0);

    return this.prisma.lobbyPlayer.update({
      where: { id: playerId },
      data: {
        streakCurrent: newStreak,
        streakMax: newStreakMax,
        finalScore: newScore,
      },
    });
  }

  /* -------------------------------- STATE / SNAPSHOTS -------------------------------- */

  async getLobbyStateByPin(pinCode: string) {
    const session = await this.findByPin(pinCode);
    if (!session) return null;

    const players = await this.prisma.lobbyPlayer.findMany({
      where: {
        sessionId: session.id,
        isKicked: false,
        leftAt: null,
      },
      select: { id: true, nickname: true },
      orderBy: { joinedAt: 'asc' },
    });

    return {
      session,
      players,
    };
  }

  async getLeaderboard(sessionId: string) {
    const players = await this.prisma.lobbyPlayer.findMany({
      where: { sessionId },
    });

    return players
      .map((p) => ({
        playerId: p.id,
        nickname: p.nickname,
        score: p.finalScore || 0,
        streakMax: p.streakMax || 0,
      }))
      .sort((a, b) => b.score - a.score);
  }

  /* -------------------------------- HOST DASHBOARD -------------------------------- */

  async getHostDashboard(hostId: string) {
    const sessions = await this.prisma.lobbySession.findMany({
      where: { hostId },
      include: {
        players: {
          where: { leftAt: null, isKicked: false },
          select: { id: true, nickname: true, finalScore: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return sessions.map((s) => ({
      sessionId: s.id,
      kahootId: s.kahootId,
      pinCode: s.pinCode,
      status: s.status,
      playerCount: s.players.length,
      players: s.players,
      createdAt: s.createdAt,
    }));
  }
}
