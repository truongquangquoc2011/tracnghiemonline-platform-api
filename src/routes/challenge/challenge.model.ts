import { z } from 'zod';

/** Reuseable primitives */
export const objectIdRegex = /^[a-f\d]{24}$/i;
export const ObjectIdSchema = z.string().regex(objectIdRegex, 'Invalid ObjectId');

export const PaginationSchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
});

export const SortOrderSchema = z.enum(['asc', 'desc']).default('desc');

export const ChallengeStatusSchema = z.enum(['draft', 'open', 'closed']);

/** ====== LIST / DETAIL ====== */
export const ListChallengesQuerySchema = PaginationSchema.extend({
  kahoot_id: ObjectIdSchema.optional(),
  creator_id: ObjectIdSchema.optional(),
  status: ChallengeStatusSchema.optional(),
  sort: z
    .string()
    .default('createdAt.desc')
    .refine(
      (v) =>
        [
          'createdAt.asc',
          'createdAt.desc',
          'startAt.asc',
          'startAt.desc',
          'dueAt.asc',
          'dueAt.desc',
          'title.asc',
          'title.desc',
        ].includes(v),
      'Invalid sort',
    ),
});

export const ChallengeParamSchema = z.object({
  id: ObjectIdSchema,
});

/** ====== CREATE / UPDATE ====== */
export const CreateChallengeBodySchema = z
  .object({
    kahoot_id: ObjectIdSchema,
    title: z.string().trim().min(1).max(200),
    intro_text: z.string().trim().max(2000).optional(),
    start_at: z.string().datetime().optional(), // ISO string
    due_at: z.string().datetime().optional(), // ISO string
    answer_order_random: z.coerce.boolean().default(true),
    question_order_random: z.coerce.boolean().default(false),
    streaks_enabled: z.coerce.boolean().default(true),
    status: ChallengeStatusSchema.default('open').optional(), // allow create as 'draft'
  })
  .refine(
    (d) => {
      if (!d.start_at || !d.due_at) return true;
      return new Date(d.start_at).getTime() < new Date(d.due_at).getTime();
    },
    { message: 'start_at must be before due_at', path: ['start_at'] },
  );

export const UpdateChallengeBodySchema = z
  .object({
    title: z.string().trim().min(1).max(200).optional(),
    intro_text: z.string().trim().max(2000).optional(),
    start_at: z.string().datetime().optional(),
    due_at: z.string().datetime().optional(),
    answer_order_random: z.coerce.boolean().optional(),
    question_order_random: z.coerce.boolean().optional(),
    streaks_enabled: z.coerce.boolean().optional(),
    status: ChallengeStatusSchema.optional(),
  })
  .refine(
    (d) => {
      if (!d.start_at || !d.due_at) return true;
      return new Date(d.start_at).getTime() < new Date(d.due_at).getTime();
    },
    { message: 'start_at must be before due_at', path: ['start_at'] },
  );

/** ====== OPEN/CLOSE ====== */
// (không cần body – chỉ dùng param :id)

/** ====== START ATTEMPT ====== */
export const StartAttemptParamSchema = z.object({
  id: ObjectIdSchema, // challenge id
});

export const StartAttemptBodySchema = z.object({
  nickname: z.string().trim().min(1).max(50),
  // user_id lấy từ token nếu đăng nhập – không cần trong body
});

/** ====== SUBMIT ATTEMPT ====== */
export const SubmitAttemptParamSchema = z.object({
  attempt_id: ObjectIdSchema,
});
export const SubmitAttemptBodySchema = z.object({}); // không cần fields

/** ====== SUBMIT ANSWER ====== */
export const SubmitAnswerParamSchema = z.object({
  attempt_id: ObjectIdSchema,
});
export const SubmitAnswerBodySchema = z.object({
  question_id: ObjectIdSchema,
  answer_id: ObjectIdSchema.nullish(), // cho phép null (bỏ qua/không chọn)
  time_taken_ms: z.coerce.number().int().min(0),
});

/** ====== LIST ATTEMPTS (creator) ====== */
export const ListAttemptsParamSchema = z.object({
  id: ObjectIdSchema, // challenge id
});
export const ListAttemptsQuerySchema = PaginationSchema.extend({
  // sort mặc định theo điểm giảm dần
  sort: z
    .string()
    .default('scoreTotal.desc')
    .refine(
      (v) =>
        [
          'scoreTotal.asc',
          'scoreTotal.desc',
          'submittedAt.asc',
          'submittedAt.desc',
          'startedAt.asc',
          'startedAt.desc',
        ].includes(v),
      'Invalid sort',
    ),
});

/** ====== LEADERBOARD (creator/owner) ====== */
export const ListLeaderboardQuerySchema = PaginationSchema.extend({
  // sort mặc định theo điểm giảm dần
  sort: z
    .string()
    .default('scoreTotal.desc')
    .refine(
      (v) =>
        [
          'scoreTotal.asc',
          'scoreTotal.desc',
          'submittedAt.asc',
          'submittedAt.desc',
          'nickname.asc',
          'nickname.desc',
        ].includes(v),
      'Invalid sort',
    ),
});

/** ====== ATTEMPT DETAIL / RESPONSES ====== */
export const AttemptParamSchema = z.object({
  attempt_id: ObjectIdSchema,
});
