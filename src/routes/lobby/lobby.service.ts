import {
  Injectable,
  ForbiddenException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { LobbyRepository } from './lobby.repo';
import { computePoints } from './utils/score.util';


@Injectable()
export class LobbyService {
  constructor(private readonly repo: LobbyRepository) {}

  async createLobby(
    kahootId: string,
    userId: string, // 👈 đổi thành userId
    data: {
      mode: 'classic' | 'team';
      answerOrderRandom: boolean;
      questionOrderRandom: boolean;
      streaksEnabled: boolean;
      nicknameGenerator: boolean;
      settingsJson?: string;
    },
  ) {
    return this.repo.createLobby(kahootId, userId, data);
  }

  async joinLobbyByPin(
    pinCode: string,
    payload: {
      nickname: string;
      userId?: string | null;
      teamId?: string | null;
    },
  ) {
    const session = await this.repo.findByPin(pinCode);
    if (!session) throw new NotFoundException('Lobby not found');
    if (session.status !== 'waiting' && session.status !== 'running') {
      throw new BadRequestException('Lobby is not joinable');
    }
    const player = await this.repo.addPlayer(session.id, payload);
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
}
