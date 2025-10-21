import { createZodDto } from 'nestjs-zod';
import {
  AttemptParamSchema,
  ChallengeParamSchema,
  CreateChallengeBodySchema,
  ListAttemptsParamSchema,
  ListAttemptsQuerySchema,
  ListChallengesQuerySchema,
  StartAttemptBodySchema,
  StartAttemptParamSchema,
  SubmitAnswerBodySchema,
  SubmitAnswerParamSchema,
  SubmitAttemptBodySchema,
  SubmitAttemptParamSchema,
  UpdateChallengeBodySchema,
  ListLeaderboardQuerySchema,
} from '../challenge.model';

/** ====== LIST / DETAIL ====== */
export class ListChallengesQueryDTO extends createZodDto(ListChallengesQuerySchema) {}
export class ChallengeParamDTO extends createZodDto(ChallengeParamSchema) {}

/** ====== CREATE / UPDATE ====== */
export class CreateChallengeBodyDTO extends createZodDto(CreateChallengeBodySchema) {}
export class UpdateChallengeBodyDTO extends createZodDto(UpdateChallengeBodySchema) {}

/** ====== OPEN/CLOSE ====== */
// chỉ dùng ChallengeParamDTO

/** ====== START ATTEMPT ====== */
export class StartAttemptParamDTO extends createZodDto(StartAttemptParamSchema) {}
export class StartAttemptBodyDTO extends createZodDto(StartAttemptBodySchema) {}

/** ====== SUBMIT ATTEMPT ====== */
export class SubmitAttemptParamDTO extends createZodDto(SubmitAttemptParamSchema) {}
export class SubmitAttemptBodyDTO extends createZodDto(SubmitAttemptBodySchema) {}

/** ====== SUBMIT ANSWER ====== */
export class SubmitAnswerParamDTO extends createZodDto(SubmitAnswerParamSchema) {}
export class SubmitAnswerBodyDTO extends createZodDto(SubmitAnswerBodySchema) {}

/** ====== LIST ATTEMPTS (creator) ====== */
export class ListAttemptsParamDTO extends createZodDto(ListAttemptsParamSchema) {}
export class ListAttemptsQueryDTO extends createZodDto(ListAttemptsQuerySchema) {}

/** ====== ATTEMPT DETAIL / RESPONSES ====== */
export class AttemptParamDTO extends createZodDto(AttemptParamSchema) {}

/** ====== LEADERBOARD (creator/owner) ====== */
export class ListLeaderboardQueryDTO extends createZodDto(ListLeaderboardQuerySchema) {}
