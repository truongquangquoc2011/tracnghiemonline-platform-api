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
import { TokenService } from 'src/shared/services/token.service';
import { JwtType } from 'src/shared/@types/jwt.type';
import { Logger } from '@nestjs/common';

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

  private readonly logger = new Logger('LobbyGateway');

  private readonly starting = new Set<string>();
  private readonly clientState = new Map<
    string,
    {
      pinCode: string;
      sessionId: string;
      playerId: string; // với host sẽ là "HOST-<sessionId>"
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

  constructor(
    private readonly service: LobbyService,
    private readonly tokenService: TokenService,
  ) {}

  // ===== WS AUTH: verify token & attach userId =====
  async handleConnection(client: Socket) {
    try {
      const tokenFromAuth = (client.handshake.auth?.token as string) || '';
      const tokenFromHeader =
        (client.handshake.headers['authorization'] as string) || '';
      const raw =
        tokenFromAuth ||
        (tokenFromHeader?.startsWith('Bearer ')
          ? tokenFromHeader.slice('Bearer '.length)
          : '');

      if (!raw) {
        this.logger.warn(`Missing token for ${client.id}`);
        client.emit('error_message', { code: 'UNAUTHORIZED' });
        client.disconnect(true);
        return;
      }

      const payload = await this.tokenService.verifyToken(
        raw,
        JwtType.accessToken,
      );
      const userId = payload?.userId;
      if (!userId) {
        this.logger.warn(`Invalid token payload for ${client.id}`);
        client.emit('error_message', { code: 'UNAUTHORIZED' });
        client.disconnect(true);
        return;
      }

      client.data.userId = String(userId);
      this.logger.log(`WS connected ${client.id} userId=${client.data.userId}`);
    } catch (e: any) {
      this.logger.error(`Auth error ${client.id}: ${e?.message}`);
      client.emit('error_message', { code: 'UNAUTHORIZED' });
      client.disconnect(true);
    }
  }

  async handleDisconnect(client: Socket) {
    const st = this.clientState.get(client.id);
    if (!st) return;

    try {
      // Nếu host rời → coi như phòng bị đóng, phát thông báo cho tất cả client trong phòng
      if (st.isHost) {
        this.logger.log(`Host disconnected, closing lobby ${st.pinCode}`);
        // Dọn timer câu hỏi (nếu có)
        this.clearQuestionTimer(st.pinCode);
        this.questionState.delete(st.pinCode);

        // (tuỳ bạn) Có thể cập nhật DB trạng thái session tại đây nếu muốn đóng session.

        // Thông báo tới tất cả client trong phòng
        this.server.to(st.pinCode).emit(LobbyEvents.HOST_LEAVE, {
          pinCode: st.pinCode,
        });
      } else {
        // Player rời bình thường
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

  // ---------------- common utils ----------------
  private emitError(client: Socket, message: string) {
    client.emit(LobbyEvents.ERROR, { message });
  }

  private emitParticipantsSnapshot(pinCode: string, target?: Socket) {
    const participants: ParticipantsSnapshot['participants'] = [];
    for (const [, st] of this.clientState) {
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

  // ---------------- player/host join/leave ----------------
  @SubscribeMessage(LobbyEvents.JOIN_LOBBY)
  async onJoin(
    @MessageBody() body: JoinLobbyPayload,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const { pinCode, nickname, teamId, playerId } = body;
      if (!pinCode) throw new Error('Invalid pin');

      const userId = client.data.userId as string;
      const session = await this.service.getSessionByPin(pinCode);
      if (!session) throw new Error('Phòng không tồn tại');

      const isHost = String(userId) === String(session.hostId);

      // ==== HOST JOIN ====
      if (isHost) {
        client.join(pinCode);
        this.clientState.set(client.id, {
          pinCode,
          sessionId: session.id,
          playerId: `HOST-${session.id}`,
          nickname: 'Host',
          isHost: true,
        });

        client.emit('role_assigned', { role: 'host' });
        client.emit(
          LobbyEvents.LOBBY_STATE,
          await this.service.getLeaderboardByPin(pinCode),
        );
        this.emitParticipantsSnapshot(pinCode, client);
        this.emitParticipantsSnapshot(pinCode);

        const qs = this.questionState.get(pinCode);
        if (qs?.lastStarted)
          client.emit(LobbyEvents.QUESTION_STARTED, qs.lastStarted);

        this.logger.log(`🎮 Host joined room ${pinCode}`);
        return;
      }

      // ==== PLAYER RESUME ====
      if (playerId) {
        const player = await this.service.findPlayerInPin(pinCode, playerId);
        if (!player) throw new Error('Player not found or not in this lobby');

        client.join(pinCode);
        this.clientState.set(client.id, {
          pinCode,
          sessionId: player.sessionId,
          playerId: player.id,
          nickname: player.nickname,
        });

        client.emit('role_assigned', { role: 'player' });
        client.emit(
          LobbyEvents.LOBBY_STATE,
          await this.service.getLeaderboardByPin(pinCode),
        );

        this.emitParticipantsSnapshot(pinCode, client);
        this.emitParticipantsSnapshot(pinCode);

        const qs = this.questionState.get(pinCode);
        if (qs?.lastStarted)
          client.emit(LobbyEvents.QUESTION_STARTED, qs.lastStarted);
        return;
      }

      // ==== PLAYER NEW JOIN ====
      const { sessionId, player } = await this.service.joinLobbyByPin(pinCode, {
        nickname,
        userId,
        teamId: teamId || null,
      });

      client.join(pinCode);
      this.clientState.set(client.id, {
        pinCode,
        sessionId,
        playerId: player.id,
        nickname: player.nickname,
      });

      client.emit('role_assigned', { role: 'player' });
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

  // ---------------- game flow ----------------
  @SubscribeMessage(LobbyEvents.START_GAME)
  async onStart(
    @MessageBody() body: StartGamePayload,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const st = this.clientState.get(client.id);
      if (!st) throw new Error('Not joined');
      const session = await this.service.getSessionById(st.sessionId);
      if (!session) throw new Error('Lobby not found');

      const userId = client.data.userId as string;
      if (String(userId) !== String(session.hostId)) {
        throw new Error('Only host can start the game');
      }

      if (session.status !== 'waiting') {
        throw new Error('Lobby already started or ended');
      }

      if (this.starting.has(st.pinCode)) return; // chống double click
      this.starting.add(st.pinCode);

      const COUNTDOWN_MS = 5000;
      const startAt = Date.now() + COUNTDOWN_MS;
      this.server.to(st.pinCode).emit(LobbyEvents.GAME_STARTING, { startAt });

      setTimeout(async () => {
        try {
          await this.service.startGame(st.sessionId, session.hostId);
          this.server
            .to(st.pinCode)
            .emit(LobbyEvents.GAME_STARTED, { startedAt: Date.now() });

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
      if (!st) throw new Error('Not joined');

      const session = await this.service.getSessionById(st.sessionId);
      if (!session) throw new Error('Lobby not found');
      const userId = client.data.userId as string;
      if (String(userId) !== String(session.hostId)) {
        throw new Error('Only host can change question');
      }

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
      if (!st) throw new Error('Not joined');

      const session = await this.service.getSessionById(st.sessionId);
      if (!session) throw new Error('Lobby not found');
      const userId = client.data.userId as string;
      if (String(userId) !== String(session.hostId)) {
        throw new Error('Only host can end the game');
      }

      await this.service.endGame(st.sessionId, st.playerId);
      const leaderboard = await this.service.getLeaderboardByPin(st.pinCode);
      this.server.to(st.pinCode).emit(LobbyEvents.GAME_ENDED, { leaderboard });

      this.clearQuestionTimer(st.pinCode);
      this.questionState.delete(st.pinCode);

      // (Tuỳ chọn) Có thể phát thêm HOST_LEAVE nếu muốn FE coi như phòng đóng hẳn:
      // this.server.to(st.pinCode).emit(LobbyEvents.HOST_LEAVE, { pinCode: st.pinCode });
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

      const session = await this.service.getSessionById(st.sessionId);
      if (!session) throw new Error('Lobby not found');
      const userId = client.data.userId as string;
      if (String(userId) !== String(session.hostId)) {
        throw new Error('Only host can kick players');
      }

      await this.service.kickPlayer(st.sessionId, body.playerId);

      // Tìm socket của player bị kick
      for (const [cid, cst] of this.clientState) {
        if (cst.playerId === body.playerId) {
          const target = this.server.sockets.sockets.get(cid);
          // Ping riêng tới người bị kick
          target?.emit(LobbyEvents.PLAYER_KICKED, { playerId: body.playerId });
          target?.leave(cst.pinCode);
          target?.disconnect(true);
          this.clientState.delete(cid);
          break;
        }
      }

      // Broadcast cho cả phòng để FE khác update UI
      this.server
        .to(st.pinCode)
        .emit(LobbyEvents.PLAYER_KICKED, { playerId: body.playerId });

      this.emitParticipantsSnapshot(st.pinCode);
    } catch (e: any) {
      this.emitError(client, e.message || 'Failed to kick player');
    }
  }
}
