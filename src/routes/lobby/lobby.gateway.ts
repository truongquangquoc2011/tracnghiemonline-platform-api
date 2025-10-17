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
import { AnswerShape as DbAnswerShape } from '@prisma/client';

// Giữ strict type cho FE
function nonNullString(input: string | null | undefined): string {
  return input ?? '';
}

// Map enum Prisma -> FE type
const SHAPE_MAP: Record<
  DbAnswerShape,
  'triangle' | 'diamond' | 'circle' | 'square'
> = {
  triangle: 'triangle',
  diamond: 'diamond',
  circle: 'circle',
  square: 'square',
};

@WebSocketGateway({ cors: { origin: '*' } })
export class LobbyGateway {
  @WebSocketServer() server: Server;
  private readonly starting = new Set<string>();
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
      // host không được tính là participant
      if (st.pinCode === pinCode && !st.isHost) {
        participants.push({
          playerId: st.playerId,
          nickname: st.nickname,
          isHost: false,
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
      if (!st.isHost) {
        await this.service.leaveLobby(st.sessionId, st.playerId);
        this.server
          .to(st.pinCode)
          .emit(LobbyEvents.PLAYER_LEFT, { playerId: st.playerId });
        this.emitParticipantsSnapshot(st.pinCode);
      }
      client.leave(st.pinCode);
    } finally {
      this.clientState.delete(client.id);
    }
  }

  // ---------------- player join/leave ----------------
  @SubscribeMessage(LobbyEvents.JOIN_LOBBY)
  async onJoin(
    @MessageBody() body: JoinLobbyPayload,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { pinCode, nickname, teamId, userId, playerId } = body;

      // 👇 Nếu có playerId -> resume không tạo mới
      if (playerId) {
        const player = await this.service.findPlayerInPin(pinCode, playerId); // tự viết repo: check playerId thuộc session pinCode
        if (!player) throw new Error('Player not found or not in this lobby');

        client.join(pinCode);
        this.clientState.set(client.id, {
          pinCode,
          sessionId: player.sessionId,
          playerId: player.id,
          nickname: player.nickname,
        });

        client.emit(
          LobbyEvents.LOBBY_STATE,
          await this.service.getLeaderboardByPin(pinCode),
        );

        // Không broadcast PLAYER_JOINED vì chỉ gắn lại
        this.emitParticipantsSnapshot(pinCode, client);
        this.emitParticipantsSnapshot(pinCode);
        const qs = this.questionState.get(pinCode);
        if (qs?.lastStarted)
          client.emit(LobbyEvents.QUESTION_STARTED, qs.lastStarted);
        return;
      }

      // ⚙️ Flow cũ: tạo player mới
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

      client.emit(
        LobbyEvents.LOBBY_STATE,
        await this.service.getLeaderboardByPin(pinCode),
      );
      this.server.to(pinCode).emit(LobbyEvents.PLAYER_JOINED, {
        playerId: player.id,
        nickname: player.nickname,
      });

      this.emitParticipantsSnapshot(pinCode, client);
      this.emitParticipantsSnapshot(pinCode);

      const qs = this.questionState.get(pinCode);
      if (qs?.lastStarted)
        client.emit(LobbyEvents.QUESTION_STARTED, qs.lastStarted);
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
    if (!st || st.isHost) return;
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
    if (body?.pinCode) this.emitParticipantsSnapshot(body.pinCode, client);
  }

  // ---------------- host join ----------------
  @SubscribeMessage('host_join')
  async onHostJoin(
    @MessageBody() body: { pinCode: string; hostId?: string },
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const session = await this.service.getSessionByPin(body.pinCode);
      if (!session) throw new Error('Phòng không tồn tại');

      client.join(body.pinCode);
      this.clientState.set(client.id, {
        pinCode: body.pinCode,
        sessionId: session.id,
        playerId: `HOST-${session.id}`,
        nickname: 'Host',
        isHost: true,
      });

      client.emit('host_joined', {
        pinCode: body.pinCode,
        kahootId: session.kahootId,
        status: session.status,
      });

      this.emitParticipantsSnapshot(body.pinCode, client);
      console.log(`🎮 Host joined room ${body.pinCode}`);
    } catch (e: any) {
      this.emitError(client, e.message || 'Failed to join as host');
    }
  }

  // ---------------- game flow ----------------
  @SubscribeMessage(LobbyEvents.START_GAME)
  async onStart(
    @MessageBody() body: StartGamePayload,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const st = this.clientState.get(client.id);
      if (!st?.isHost) throw new Error('Only host can start the game');

      // Lấy session để biết hostId (userId thật)
      const session = await this.service.getSessionById(st.sessionId);
      if (!session) throw new Error('Lobby not found');

      // Nếu đã bắt đầu hoặc kết thúc thì thôi
      if (session.status !== 'waiting') {
        throw new Error('Lobby already started or ended');
      }

      // Chống double click / đua tay
      if (this.starting.has(st.pinCode)) {
        // đã có countdown khác đang chạy → bỏ qua yên lặng
        return;
      }
      this.starting.add(st.pinCode);

      // 1) Phát đếm ngược 5s
      const COUNTDOWN_MS = 5000;
      const startAt = Date.now() + COUNTDOWN_MS;
      this.server.to(st.pinCode).emit(LobbyEvents.GAME_STARTING, { startAt });

      // 2) Hết 5s mới start thật + phát câu đầu
      setTimeout(async () => {
        try {
          // 🔧 FIX CHÍNH: truyền đúng userId của host
          await this.service.startGame(st.sessionId, session.hostId);

          // Thông báo game đã bắt đầu (client chuyển trang)
          this.server
            .to(st.pinCode)
            .emit(LobbyEvents.GAME_STARTED, { startedAt: Date.now() });

          // Lấy và phát câu đầu
          const fresh = await this.service.getSessionById(st.sessionId);
          const bundle = await this.service.getQuestionForIndex(
            fresh.kahootId,
            0,
          );
          if (!bundle) return;

          const now = Date.now();
          const expiresAt = now + (bundle.q.timeLimit ?? 20) * 1000;

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
            answers: bundle.answers.map((a) => ({
              id: a.id,
              text: nonNullString(a.text),
              shape: SHAPE_MAP[a.shape],
              colorHex: a.colorHex ?? null,
              orderIndex: a.orderIndex ?? null,
            })),
            expiresAt,
          };

          const stQ = this.questionState.get(st.pinCode);
          if (stQ) stQ.lastStarted = payload;

          this.server
            .to(st.pinCode)
            .emit(LobbyEvents.QUESTION_STARTED, payload);
          this.scheduleCloseQuestion(st.pinCode);
        } catch (err: any) {
          // Nếu service ném lỗi (ví dụ race ở DB), báo về client
          this.emitError(client, err?.message || 'Failed to start game');
        } finally {
          this.starting.delete(st.pinCode);
        }
      }, COUNTDOWN_MS);
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
      if (!st?.isHost) throw new Error('Only host can change question');

      const session = await this.service.getSessionById(st.sessionId);
      const bundle = await this.service.getQuestionForIndex(
        session.kahootId,
        body.nextIndex,
      );
      if (!bundle) return this.emitError(client, 'No more questions');

      const now = Date.now();
      const expiresAt = now + (bundle.q.timeLimit ?? 20) * 1000;

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
        answers: bundle.answers.map((a) => ({
          id: a.id,
          text: nonNullString(a.text),
          shape: SHAPE_MAP[a.shape],
          colorHex: a.colorHex ?? null,
          orderIndex: a.orderIndex ?? null,
        })),
        expiresAt,
      };

      const stQ = this.questionState.get(st.pinCode);
      if (stQ) stQ.lastStarted = payload;

      this.server.to(st.pinCode).emit(LobbyEvents.QUESTION_STARTED, payload);
      this.scheduleCloseQuestion(st.pinCode);
    } catch (e: any) {
      this.emitError(client, e.message || 'Failed to go next question');
    }
  }

  @SubscribeMessage(LobbyEvents.SUBMIT_ANSWER)
  async onSubmit(
    @MessageBody() body: SubmitAnswerPayload,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const st = this.clientState.get(client.id);
      if (!st || st.isHost) return; // host không submit

      const qs = this.questionState.get(st.pinCode);
      if (!qs || Date.now() > qs.expiresAt) {
        client.emit(LobbyEvents.ANSWER_REJECTED_LATE, {
          questionId: body.questionId,
          reason: 'deadline_exceeded',
        });
        return;
      }

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

      client.emit(LobbyEvents.ANSWER_ACCEPTED, {
        questionId: body.questionId,
        acceptedAt: new Date().toISOString(),
      });

      client.emit(LobbyEvents.ANSWER_FEEDBACK, {
        playerId: st.playerId,
        isCorrect: result.isCorrect,
        points: result.points,
      });

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
      if (!st?.isHost) throw new Error('Only host can end the game');

      await this.service.endGame(st.sessionId, st.playerId);
      const leaderboard = await this.service.getLeaderboardByPin(st.pinCode);
      this.server.to(st.pinCode).emit(LobbyEvents.GAME_ENDED, { leaderboard });

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
      if (!st?.isHost) throw new Error('Only host can kick players');

      await this.service.kickPlayer(st.sessionId, body.playerId);
      this.server
        .to(st.pinCode)
        .emit(LobbyEvents.PLAYER_KICKED, { playerId: body.playerId });

      this.emitParticipantsSnapshot(st.pinCode);
    } catch (e: any) {
      this.emitError(client, e.message || 'Failed to kick player');
    }
  }
}
