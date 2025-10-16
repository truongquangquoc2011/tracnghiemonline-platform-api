// lobby.events.ts

export enum LobbyEvents {
  JOIN_LOBBY = 'join_lobby',
  LEAVE_LOBBY = 'leave_lobby',
  START_GAME = 'start_game',
  NEXT_QUESTION = 'next_question',
  SUBMIT_ANSWER = 'submit_answer',
  END_GAME = 'end_game',
  KICK_PLAYER = 'kick_player',

  PARTICIPANTS_GET = 'participants:get',

  LOBBY_STATE = 'lobby_state',
  PLAYER_JOINED = 'player_joined',
  PLAYER_LEFT = 'player_left',
  PLAYER_KICKED = 'player_kicked',
  GAME_STARTED = 'game_started',
  QUESTION_STARTED = 'question_started',
  ANSWER_FEEDBACK = 'answer_feedback',
  LEADERBOARD_UPDATE = 'leaderboard_update',
  GAME_ENDED = 'game_ended',
  ERROR = 'error',

  PARTICIPANTS = 'participants',
  QUESTION_CLOSED = 'question_closed',
  ANSWER_REJECTED_LATE = 'answer_rejected_late',
  ANSWER_ACCEPTED = 'answer_accepted',
  HOST_JOIN = 'host_join',
  HOST_LEAVE = 'host_leave',
}
// --- Host-only events ---
export enum HostLobbyEvents {
  HOST_JOIN = 'host_join',
  HOST_LEAVE = 'host_leave',
  HOST_LOCK_ROOM = 'host_lock_room',
  HOST_UNLOCK_ROOM = 'host_unlock_room',
  HOST_KICK_PLAYER = 'host_kick_player',
  HOST_START_GAME = 'host_start_game',
  HOST_END_GAME = 'host_end_game',
  HOST_GET_STATE = 'host_get_state',
  HOST_STATE = 'host_state',
}
export type Shape = 'triangle' | 'diamond' | 'circle' | 'square';

export type JoinLobbyPayload = {
  pinCode: string;
  nickname: string;
  teamId?: string | null;
  userId?: string | null;
};

export type SubmitAnswerPayload = {
  pinCode: string;
  questionId: string;
  answerId: string | null;
  timeTakenMs: number;
};

export type StartGamePayload = { pinCode: string };
export type NextQuestionPayload = { pinCode: string; nextIndex: number };
export type KickPlayerPayload = { pinCode: string; playerId: string };

export type ParticipantsSnapshot = {
  pinCode: string;
  participants: Array<{ playerId: string; nickname: string; isHost?: boolean }>;
};

export type QuestionStartedPayload = {
  index: number;
  question: {
    id: string;
    text: string; // FE mong đợi string (không null)
    imageUrl?: string | null;
    videoUrl?: string | null;
    timeLimit: number; // giây
    pointsMultiplier?: number | null;
  };
  answers: Array<{
    id: string;
    text: string; // FE mong đợi string (không null)
    shape: Shape;
    colorHex?: string | null;
    orderIndex?: number | null;
  }>;
  expiresAt: number; // epoch ms
};

export type QuestionClosedPayload = {
  questionId: string;
  expiresAt: number;
  closedAt: string; // ISO
  counts: Record<string, number>; // answerId -> count
};
