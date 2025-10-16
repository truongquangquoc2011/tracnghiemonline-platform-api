import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { LobbyService } from './lobby.service';
import {
  LobbyEvents,
  JoinLobbyPayload,
  SubmitAnswerPayload,
  StartGamePayload,
  NextQuestionPayload,
  KickPlayerPayload,
  ParticipantsSnapshot,
  QuestionStartedPayload,
  QuestionClosedPayload,
} from './lobby.events';
import { AnswerShape as DbAnswerShape } from '@prisma/client'; // ✅ enum Prisma

// Giữ strict type cho FE: text luôn là string
function nonNullString(input: string | null | undefined): string {
  return input ?? '';
}

// Map enum Prisma -> union string FE (không ép kiểu as)
const SHAPE_MAP: Record<
  DbAnswerShape,
  'triangle' | 'diamond' | 'circle' | 'square'
> = {
  triangle: 'triangle',
  diamond: 'diamond',
  circle: 'circle',
  square: 'square',
};
// You can set a dedicated namespace if you like: namespace: '/lobby'
@WebSocketGateway({ cors: { origin: '*' } })
export class LobbyGateway {
  @WebSocketServer() server: Server;

  /**
   * clientState: theo dõi socket -> thông tin hiện tại để:
   * - snapshot participants realtime
   * - kiểm tra pinCode/sessionId khi xử lý event
   */
  private readonly clientState = new Map<
    string,
    {
      pinCode: string;
      sessionId: string;
      playerId: string;
      nickname: string;
      isHost?: boolean;
    }
  >();

  /**
   * questionState: theo dõi per-room (pinCode) câu hỏi đang mở
   * - expiresAt để server chặn nộp trễ
   * - timeout để auto emit question_closed
   * - counts: thống kê số lượt chọn theo answerId
   * - lastStarted: cache QUESTION_STARTED để sync client vào muộn
   */
  private readonly questionState = new Map<
    string,
    {
      questionId: string;
      expiresAt: number;
      timeout: NodeJS.Timeout | null;
      counts: Record<string, number>;
      lastStarted?: QuestionStartedPayload;
    }
  >();

  constructor(private readonly service: LobbyService) {}

  // ---------------- common utils ----------------
  private emitError(client: Socket, message: string) {
    client.emit(LobbyEvents.ERROR, { message });
  }

  private emitParticipantsSnapshot(pinCode: string, target?: Socket) {
    const participants: ParticipantsSnapshot['participants'] = [];
    for (const [_, st] of this.clientState) {
      if (st.pinCode === pinCode) {
        participants.push({
          playerId: st.playerId,
          nickname: st.nickname,
          isHost: !!st.isHost,
        });
      }
    }
    const payload: ParticipantsSnapshot = { pinCode, participants };
    if (target) target.emit(LobbyEvents.PARTICIPANTS, payload);
    else this.server.to(pinCode).emit(LobbyEvents.PARTICIPANTS, payload);
  }

  private clearQuestionTimer(pinCode: string) {
    const st = this.questionState.get(pinCode);
    if (st?.timeout) clearTimeout(st.timeout);
    if (st) st.timeout = null;
  }

  private scheduleCloseQuestion(pinCode: string) {
    const st = this.questionState.get(pinCode);
    if (!st) return;
    const msLeft = Math.max(0, st.expiresAt - Date.now());
    const t = setTimeout(() => {
      const cur = this.questionState.get(pinCode);
      if (!cur) return;
      const closed: QuestionClosedPayload = {
        questionId: cur.questionId,
        expiresAt: cur.expiresAt,
        closedAt: new Date().toISOString(),
        counts: cur.counts,
      };
      this.server.to(pinCode).emit(LobbyEvents.QUESTION_CLOSED, closed);
      this.questionState.delete(pinCode);
    }, msLeft);
    st.timeout = t;
  }

  // ---------------- lifecycle ----------------
  async handleDisconnect(client: Socket) {
    const st = this.clientState.get(client.id);
    if (!st) return;
    try {
      await this.service.leaveLobby(st.sessionId, st.playerId);
      client.leave(st.pinCode);
      this.server
        .to(st.pinCode)
        .emit(LobbyEvents.PLAYER_LEFT, { playerId: st.playerId });
      this.emitParticipantsSnapshot(st.pinCode);
    } finally {
      this.clientState.delete(client.id);
    }
  }

  // ---------------- participants ----------------
  @SubscribeMessage(LobbyEvents.JOIN_LOBBY)
  async onJoin(
    @MessageBody() body: JoinLobbyPayload,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { pinCode, nickname, teamId, userId } = body;
      const { sessionId, player } = await this.service.joinLobbyByPin(pinCode, {
        nickname,
        userId: userId || null,
        teamId: teamId || null,
      });

      client.join(pinCode);
      this.clientState.set(client.id, {
        pinCode,
        sessionId,
        playerId: player.id,
        nickname: player.nickname,
      });

      // Echo state + notify others
      client.emit(
        LobbyEvents.LOBBY_STATE,
        await this.service.getLeaderboardByPin(pinCode),
      );
      this.server.to(pinCode).emit(LobbyEvents.PLAYER_JOINED, {
        playerId: player.id,
        nickname: player.nickname,
      });

      // gửi snapshot participants (để owner & player thấy danh sách đầy đủ)
      this.emitParticipantsSnapshot(pinCode, client);
      this.emitParticipantsSnapshot(pinCode);

      // nếu đang có câu hỏi mở, sync cho client mới để thấy countdown
      const qs = this.questionState.get(pinCode);
      if (qs?.lastStarted) {
        client.emit(LobbyEvents.QUESTION_STARTED, qs.lastStarted);
      }
    } catch (e: any) {
      this.emitError(client, e.message || 'Failed to join lobby');
    }
  }

  @SubscribeMessage(LobbyEvents.LEAVE_LOBBY)
  async onLeave(
    @MessageBody() body: { pinCode: string },
    @ConnectedSocket() client: Socket,
  ) {
    const st = this.clientState.get(client.id);
    if (!st) return;
    try {
      await this.service.leaveLobby(st.sessionId, st.playerId);
      client.leave(st.pinCode);
      this.server
        .to(st.pinCode)
        .emit(LobbyEvents.PLAYER_LEFT, { playerId: st.playerId });
      this.emitParticipantsSnapshot(st.pinCode);
    } catch (e: any) {
      this.emitError(client, e.message || 'Failed to leave lobby');
    } finally {
      this.clientState.delete(client.id);
    }
  }

  @SubscribeMessage(LobbyEvents.PARTICIPANTS_GET)
  onParticipantsGet(
    @MessageBody() body: { pinCode: string },
    @ConnectedSocket() client: Socket,
  ) {
    if (!body?.pinCode) return;
    this.emitParticipantsSnapshot(body.pinCode, client);
  }

  // ---------------- game flow ----------------
  @SubscribeMessage(LobbyEvents.START_GAME)
  async onStart(
    @MessageBody() body: StartGamePayload,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const st = this.clientState.get(client.id);
      if (!st) throw new Error('Not joined');
      // verify host (đang dùng playerId, với BE của bạn startGame đã check hostId===userId)
      await this.service.startGame(st.sessionId, /* requesterId */ st.playerId);

      this.server
        .to(st.pinCode)
        .emit(LobbyEvents.GAME_STARTED, { startedAt: Date.now() });

      // Send first question (index 0)
      const session = await this.service.getSessionById(st.sessionId);
      const bundle = await this.service.getQuestionForIndex(
        session.kahootId,
        0,
      );
      if (bundle) {
        const now = Date.now();
        const expiresAt = now + (bundle.q.timeLimit ?? 20) * 1000;

        // cache & schedule close
        this.clearQuestionTimer(st.pinCode);
        this.questionState.set(st.pinCode, {
          questionId: bundle.q.id,
          expiresAt,
          timeout: null,
          counts: {},
          lastStarted: undefined,
        });

        const payload: QuestionStartedPayload = {
          index: 0,
          question: {
            id: bundle.q.id,
            text: nonNullString(bundle.q.text),
            imageUrl: bundle.q.imageUrl ?? null,
            videoUrl: bundle.q.videoUrl ?? null,
            timeLimit: bundle.q.timeLimit,
            pointsMultiplier: bundle.q.pointsMultiplier ?? null,
          },
          answers: bundle.answers.map(
            (a): QuestionStartedPayload['answers'][number] => ({
              id: a.id,
              text: nonNullString(a.text),
              shape: SHAPE_MAP[a.shape], // ✅ map type-safe
              colorHex: a.colorHex ?? null,
              orderIndex: a.orderIndex ?? null,
            }),
          ),
          expiresAt,
        };

        // cache lastStarted để sync client vào muộn
        const stQ = this.questionState.get(st.pinCode);
        if (stQ) stQ.lastStarted = payload;

        this.server.to(st.pinCode).emit(LobbyEvents.QUESTION_STARTED, payload);
        this.scheduleCloseQuestion(st.pinCode);
      }
    } catch (e: any) {
      this.emitError(client, e.message || 'Failed to start game');
    }
  }

  @SubscribeMessage(LobbyEvents.NEXT_QUESTION)
  async onNextQuestion(
    @MessageBody() body: NextQuestionPayload,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const st = this.clientState.get(client.id);
      if (!st) throw new Error('Not joined');
      const session = await this.service.getSessionById(st.sessionId);
      if (!session) throw new Error('Session not found');
      const bundle = await this.service.getQuestionForIndex(
        session.kahootId,
        body.nextIndex,
      );
      if (!bundle) return this.emitError(client, 'No more questions');

      const now = Date.now();
      const expiresAt = now + (bundle.q.timeLimit ?? 20) * 1000;

      // reset & cache
      this.clearQuestionTimer(st.pinCode);
      this.questionState.set(st.pinCode, {
        questionId: bundle.q.id,
        expiresAt,
        timeout: null,
        counts: {},
        lastStarted: undefined,
      });

      const payload: QuestionStartedPayload = {
        index: body.nextIndex,
        question: {
          id: bundle.q.id,
          text: nonNullString(bundle.q.text),
          imageUrl: bundle.q.imageUrl ?? null,
          videoUrl: bundle.q.videoUrl ?? null,
          timeLimit: bundle.q.timeLimit,
          pointsMultiplier: bundle.q.pointsMultiplier ?? null,
        },
        answers: bundle.answers.map(
          (a): QuestionStartedPayload['answers'][number] => ({
            id: a.id,
            text: nonNullString(a.text),
            shape: SHAPE_MAP[a.shape],
            colorHex: a.colorHex ?? null,
            orderIndex: a.orderIndex ?? null,
          }),
        ),
        expiresAt,
      };

      const stQ = this.questionState.get(st.pinCode);
      if (stQ) stQ.lastStarted = payload;

      this.server.to(st.pinCode).emit(LobbyEvents.QUESTION_STARTED, payload);
      this.scheduleCloseQuestion(st.pinCode);
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Failed to ...';
      this.emitError(client, message);
    }
  }

  @SubscribeMessage(LobbyEvents.SUBMIT_ANSWER)
  async onSubmit(
    @MessageBody() body: SubmitAnswerPayload,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const st = this.clientState.get(client.id);
      if (!st) throw new Error('Not joined');

      // chặn nộp trễ: dựa trên expiresAt server-side
      const qs = this.questionState.get(st.pinCode);
      if (!qs || Date.now() > qs.expiresAt) {
        client.emit(LobbyEvents.ANSWER_REJECTED_LATE, {
          questionId: body.questionId,
          reason: 'deadline_exceeded',
        });
        return;
      }

      // đếm chọn đáp án (để show chart khi câu đóng)
      if (body.answerId) {
        qs.counts[body.answerId] = (qs.counts[body.answerId] || 0) + 1;
      }

      const result = await this.service.submitAnswer({
        pinCode: body.pinCode,
        playerId: st.playerId,
        questionId: body.questionId,
        answerId: body.answerId || null,
        timeTakenMs: body.timeTakenMs,
      });

      // xác nhận đã nhận bài (để client khoá UI)
      client.emit(LobbyEvents.ANSWER_ACCEPTED, {
        questionId: body.questionId,
        acceptedAt: new Date().toISOString(),
      });

      // Feedback cá nhân
      client.emit(LobbyEvents.ANSWER_FEEDBACK, {
        playerId: st.playerId,
        isCorrect: result.isCorrect,
        points: result.points,
      });

      // Broadcast leaderboard update
      this.server
        .to(st.pinCode)
        .emit(LobbyEvents.LEADERBOARD_UPDATE, result.leaderboard);
    } catch (e: any) {
      this.emitError(client, e.message || 'Failed to submit answer');
    }
  }

  @SubscribeMessage(LobbyEvents.END_GAME)
  async onEnd(
    @MessageBody() body: { pinCode: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const st = this.clientState.get(client.id);
      if (!st) throw new Error('Not joined');
      await this.service.endGame(st.sessionId, st.playerId);
      const leaderboard = await this.service.getLeaderboardByPin(st.pinCode);
      this.server.to(st.pinCode).emit(LobbyEvents.GAME_ENDED, { leaderboard });

      // clear timer & state
      this.clearQuestionTimer(st.pinCode);
      this.questionState.delete(st.pinCode);
    } catch (e: any) {
      this.emitError(client, e.message || 'Failed to end game');
    }
  }

  @SubscribeMessage(LobbyEvents.KICK_PLAYER)
  async onKick(
    @MessageBody() body: KickPlayerPayload,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const st = this.clientState.get(client.id);
      if (!st) throw new Error('Not joined');
      // In production, verify host
      await this.service.kickPlayer(st.sessionId, body.playerId);
      this.server
        .to(st.pinCode)
        .emit(LobbyEvents.PLAYER_KICKED, { playerId: body.playerId });

      // cập nhật lại participants snapshot (nếu người bị kick vẫn còn socket thì sẽ tự rớt)
      this.emitParticipantsSnapshot(st.pinCode);
    } catch (e: any) {
      this.emitError(client, e.message || 'Failed to kick player');
    }
  }
}
