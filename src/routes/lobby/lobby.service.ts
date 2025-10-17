import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { LobbyRepository } from './lobby.repo';
import { computePoints } from './utils/score.util';
import { PrismaService } from 'src/shared/services/prisma.service';
type JoinOpts = {
  nickname: string;
  userId?: string | null;
  teamId?: string | null;
  clientKey?: string | null; // từ ensureClientKey()
  resumePlayerId?: string | null; // từ localStorage
};
@Injectable()
export class LobbyService {
  constructor(
    private readonly repo: LobbyRepository,
    private readonly prisma: PrismaService,
  ) {}

  async createLobby(
    kahootId: string,
    userId: string, //  đổi thành userId
    data: {
      mode: 'classic' | 'team';
      answerOrderRandom: boolean;
      questionOrderRandom: boolean;
      streaksEnabled: boolean;
      nicknameGenerator: boolean;
      settingsJson?: string;
    },
  ) {
    if (!userId) {
      throw new ForbiddenException(
        'Missing userId — bạn cần đăng nhập trước khi tạo lobby.',
      );
    }
    return this.repo.createLobby(kahootId, userId, data);
  }

  async joinLobbyByPin(pinCode: string, opts: JoinOpts) {
    const session = await this.repo.findByPin(pinCode);
    if (!session) throw new Error('Lobby not found');

    // 1) resume theo resumePlayerId
    if (opts.resumePlayerId) {
      const p = await this.repo.findPlayerById(opts.resumePlayerId);
      if (p && p.sessionId === session.id && !p.isKicked) {
        return { sessionId: session.id, player: p };
      }
    }

    // 2) idempotent theo userId (nếu có đăng nhập)
    if (opts.userId) {
      const p = await this.repo.findActivePlayerBySessionAndUser(
        session.id,
        opts.userId,
      );
      if (p) return { sessionId: session.id, player: p };
    }

    // 3) idempotent theo clientKey (khách vãng lai)
    if (opts.clientKey) {
      const p = await this.repo.findActivePlayerBySessionAndClientKey(
        session.id,
        opts.clientKey,
      );
      if (p) return { sessionId: session.id, player: p };
    }

    // 4) không có ai → tạo mới
    const player = await this.repo.createPlayer({
      sessionId: session.id,
      nickname: opts.nickname,
      userId: opts.userId ?? null,
      teamId: opts.teamId ?? null,
      clientKey: opts.clientKey ?? null,
    });

    return { sessionId: session.id, player };
  }

  async leaveLobby(sessionId: string, playerId: string) {
    return this.repo.leavePlayer(sessionId, playerId);
  }

  async startGame(sessionId: string, userId: string) {
    const session = await this.repo.findById(sessionId);
    if (!session) throw new NotFoundException('Lobby not found');
    if (session.hostId !== userId)
      throw new ForbiddenException('Only host can start the game');
    if (session.status !== 'waiting')
      throw new BadRequestException('Lobby already started or ended');
    return this.repo.setStatus(sessionId, 'running');
  }

  async endGame(sessionId: string, userId: string) {
    const session = await this.repo.findById(sessionId);
    if (!session) throw new NotFoundException('Lobby not found');
    if (session.hostId !== userId)
      throw new ForbiddenException('Only host can end the game');
    return this.repo.setStatus(sessionId, 'ended');
  }

  async getQuestionForIndex(kahootId: string, index: number) {
    const q = await this.repo.getQuestionByIndex(kahootId, index);
    if (!q) return null;
    const answers = await this.repo.getAnswersForQuestion(q.id);
    return { q, answers };
  }

  async submitAnswer(params: {
    pinCode: string;
    playerId: string;
    questionId: string;
    answerId: string | null;
    timeTakenMs: number;
  }) {
    const { pinCode, playerId, questionId, answerId, timeTakenMs } = params;
    const state = await this.repo.getLobbyStateByPin(pinCode);
    if (!state) throw new NotFoundException('Lobby not found');
    if (state.session.status !== 'running')
      throw new BadRequestException('Lobby is not running');

    const q = await this.repo.getQuestionById(questionId);
    if (!q || q.kahootId !== state.session.kahootId)
      throw new BadRequestException('Invalid question');

    let isCorrect = false;
    if (answerId) {
      const answer = await this.repo.getAnswer(answerId);
      if (!answer || answer.questionId !== q.id)
        throw new BadRequestException('Invalid answer');
      isCorrect = !!answer.isCorrect;
    }

    const points = computePoints({
      isCorrect,
      timeTakenMs,
      timeLimitSec: q.timeLimit,
      pointsMultiplier: q.pointsMultiplier ?? 1,
    });

    const basePoints = isCorrect ? 1000 : 0;
    const speedBonus = isCorrect ? Math.max(0, points - basePoints) : 0;

    const saved = await this.repo.upsertResponse({
      sessionId: state.session.id,
      playerId,
      questionId,
      answerId: answerId || null,
      isCorrect,
      timeTakenMs,
      basePoints,
      speedBonus,
      pointsAwarded: points,
    });

    await this.repo.bumpPlayerStats(playerId, isCorrect, points);
    const leaderboard = await this.repo.getLeaderboard(state.session.id);

    return { saved, points, isCorrect, leaderboard };
  }

  async getLeaderboardByPin(pinCode: string) {
    const session = await this.repo.findByPin(pinCode);
    if (!session) throw new NotFoundException('Lobby not found');
    return this.repo.getLeaderboard(session.id);
  }

  async getSessionById(sessionId: string) {
    const s = await this.repo.findById(sessionId);
    if (!s) throw new NotFoundException('Lobby not found');
    return s;
  }

  async kickPlayer(sessionId: string, playerId: string) {
    return this.repo.kickPlayer(sessionId, playerId);
  }
  getSessionByPin(pin: string) {
    return this.repo.findByPin(pin);
  }

  getLobbyStateByPin(pin: string) {
    return this.repo.getLobbyStateByPin(pin);
  }
  /**
   * Tìm player theo playerId nhưng phải ĐÚNG phòng (pinCode).
   * Dùng để resume khi reload trang: nếu còn player trong phòng thì trả về; ngược lại trả null.
   * - Không ném lỗi khi không tìm thấy player (để FE có thể tự tạo mới).
   */
  async findPlayerInPin(
    pinCode: string,
    playerId: string,
  ): Promise<{ id: string; nickname: string; sessionId: string } | null> {
    // 1) Tìm session theo pinCode
    const session = await this.prisma.lobbySession.findUnique({
      where: { pinCode }, // pinCode đang unique theo thiết kế
      select: { id: true },
    });

    if (!session) {
      // phòng không tồn tại -> FE có thể hiển thị "Lobby not found"
      return null;
    }

    // 2) Tìm đúng player thuộc session này
    const player = await this.prisma.lobbyPlayer.findFirst({
      where: {
        id: playerId,
        sessionId: session.id,
        isKicked: false,
        // Tuỳ ý ràng buộc: nếu bạn coi "leftAt != null" là đã rời phòng
        // và không cho resume thì bỏ comment:
        // leftAt: null,
      },
      select: {
        id: true,
        nickname: true,
        sessionId: true,
      },
    });

    return player ?? null;
  }
}
