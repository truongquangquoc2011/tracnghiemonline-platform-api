export enum LobbyEvents {
  // Client -> Server
  JOIN_LOBBY = 'join_lobby',
  LEAVE_LOBBY = 'leave_lobby',
  START_GAME = 'start_game',
  NEXT_QUESTION = 'next_question',
  SUBMIT_ANSWER = 'submit_answer',
  END_GAME = 'end_game',
  KICK_PLAYER = 'kick_player',

  // Server -> Client
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
}

// Shared payload types (optional - for type safety on the server side)
export type JoinLobbyPayload = {
  pinCode: string;
  nickname: string;
  teamId?: string | null;
  userId?: string | null; // optional for guest
};

export type SubmitAnswerPayload = {
  pinCode: string;
  questionId: string;
  answerId: string | null;
  timeTakenMs: number;
};

export type StartGamePayload = {
  pinCode: string;
};

export type NextQuestionPayload = {
  pinCode: string;
  nextIndex: number;
};

export type KickPlayerPayload = {
  pinCode: string;
  playerId: string;
};
