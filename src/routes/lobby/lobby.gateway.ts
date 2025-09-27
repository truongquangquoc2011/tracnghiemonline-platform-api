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
} from './lobby.events';

// You can set a dedicated namespace if you like: namespace: '/lobby'
@WebSocketGateway({ cors: { origin: '*' } })
export class LobbyGateway {
  @WebSocketServer() server: Server;
  private readonly clientState = new Map<
    string,
    { pinCode: string; sessionId: string; playerId: string; isHost?: boolean }
  >();

  constructor(private readonly service: LobbyService) {}

  private emitError(client: Socket, message: string) {
    client.emit(LobbyEvents.ERROR, { message });
  }

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
      });
      // Echo state + notify others
      client.emit(
        LobbyEvents.LOBBY_STATE,
        await this.service.getLeaderboardByPin(pinCode),
      );
      this.server
        .to(pinCode)
        .emit(LobbyEvents.PLAYER_JOINED, {
          playerId: player.id,
          nickname: player.nickname,
        });
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
    } catch (e: any) {
      this.emitError(client, e.message || 'Failed to leave lobby');
    } finally {
      this.clientState.delete(client.id);
    }
  }

  @SubscribeMessage(LobbyEvents.START_GAME)
  async onStart(
    @MessageBody() body: StartGamePayload,
    @ConnectedSocket() client: Socket,
  ) {
    try {
      const st = this.clientState.get(client.id);
      if (!st) throw new Error('Not joined');
      // For demo: trust the first socket in the room as host OR validate on your side
      // In production, verify requesterId === session.hostId
      await this.service.startGame(st.sessionId, /* requesterId */ st.playerId);
      this.server
        .to(st.pinCode)
        .emit(LobbyEvents.GAME_STARTED, { startedAt: Date.now() });

      // Send first question (index 0)
      const state = this.clientState.get(client.id);
      if (!state) return;
      const session = await this.service.getSessionById(state.sessionId);
      const bundle = await this.service.getQuestionForIndex(
        session.kahootId,
        0,
      );
      if (bundle) {
        this.server.to(state.pinCode).emit(LobbyEvents.QUESTION_STARTED, {
          index: 0,
          question: {
            id: bundle.q.id,
            text: bundle.q.text,
            imageUrl: bundle.q.imageUrl,
            videoUrl: bundle.q.videoUrl,
            timeLimit: bundle.q.timeLimit,
            pointsMultiplier: bundle.q.pointsMultiplier,
          },
          answers: bundle.answers.map((a) => ({
            id: a.id,
            text: a.text,
            shape: a.shape,
            colorHex: a.colorHex,
            orderIndex: a.orderIndex,
          })),
        });
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

      this.server.to(st.pinCode).emit(LobbyEvents.QUESTION_STARTED, {
        index: body.nextIndex,
        question: {
          id: bundle.q.id,
          text: bundle.q.text,
          imageUrl: bundle.q.imageUrl,
          videoUrl: bundle.q.videoUrl,
          timeLimit: bundle.q.timeLimit,
          pointsMultiplier: bundle.q.pointsMultiplier,
        },
        answers: bundle.answers.map((a) => ({
          id: a.id,
          text: a.text,
          shape: a.shape,
          colorHex: a.colorHex,
          orderIndex: a.orderIndex,
        })),
      });
    } catch (e: any) {
      this.emitError(client, e.message || 'Failed to fetch next question');
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
      const result = await this.service.submitAnswer({
        pinCode: body.pinCode,
        playerId: st.playerId,
        questionId: body.questionId,
        answerId: body.answerId || null,
        timeTakenMs: body.timeTakenMs,
      });

      // Feedback to the player who answered
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
    } catch (e: any) {
      this.emitError(client, e.message || 'Failed to kick player');
    }
  }

  // Auto-leave on disconnect
  async handleDisconnect(client: Socket) {
    const st = this.clientState.get(client.id);
    if (!st) return;
    await this.service.leaveLobby(st.sessionId, st.playerId);
    this.server
      .to(st.pinCode)
      .emit(LobbyEvents.PLAYER_LEFT, { playerId: st.playerId });
    this.clientState.delete(client.id);
  }
}
