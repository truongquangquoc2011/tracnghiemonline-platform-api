import { z } from 'zod';

// If you already have a shared objectId schema, import it instead
// import { objectIdSchema } from 'src/shared/zod/custom.schema'
export const objectIdSchema = z
  .string()
  .regex(/^[0-9a-fA-F]{24}$/i, 'Invalid Mongo ObjectId');

export const CreateLobbySchema = z.object({
  mode: z.enum(['classic', 'team']).default('classic'),
  answerOrderRandom: z.boolean().default(true),
  questionOrderRandom: z.boolean().default(false),
  streaksEnabled: z.boolean().default(true),
  nicknameGenerator: z.boolean().default(true),
  settingsJson: z.string().optional(),
});
export type CreateLobbyBody = z.infer<typeof CreateLobbySchema>;

export const JoinLobbySchema = z.object({
  nickname: z.string().trim().min(1).max(50),
  teamId: objectIdSchema.nullable().optional(),
});
export type JoinLobbyBody = z.infer<typeof JoinLobbySchema>;

export const SubmitAnswerSchema = z.object({
  questionId: objectIdSchema,
  answerId: objectIdSchema.nullable().optional(),
  timeTakenMs: z.number().int().nonnegative(),
});
export type SubmitAnswerBody = z.infer<typeof SubmitAnswerSchema>;
