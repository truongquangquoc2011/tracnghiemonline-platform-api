import z from 'zod';
import { VisibilitySchema } from 'src/shared/models/common.model';

/** ✅ Schema cho MongoDB ObjectId */
const ObjectIdSchema = z
  .string()
  .regex(/^[0-9a-f]{24}$/i, 'Phải là ObjectId hợp lệ của MongoDB');

/** ====== Kahoot chính ====== */
export const KahootSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  coverImage: z.string().url().optional(),
  theme: z.string().optional(),
  musicTheme: ObjectIdSchema.optional().nullable(),
  visibility: VisibilitySchema.default('private'),
  isTeamModeOk: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
  publishedAt: z.date().nullable().optional(),
});

/** ====== LIST ====== */
export const ListKahootQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  visibility: VisibilitySchema.optional(),
  tagId: z.string().optional(),
  q: z.string().optional(),
});

/** ====== CREATE / UPDATE ====== */
export const CreateKahootBodySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  visibility: VisibilitySchema.optional(),
  theme: z.string().optional(),
  musicTheme: ObjectIdSchema.optional().nullable(),
  isTeamModeOk: z.boolean().optional(),
});

export const UpdateKahootBodySchema = CreateKahootBodySchema.partial();

/** ====== REVIEW KAHOOT ====== */
/** Enum shape của đáp án (match enum AnswerShape trong Prisma) */
export const AnswerShapeSchema = z.enum(['triangle', 'diamond', 'circle', 'square']);

/** Param :id (kahoot id) */
export const KahootParamSchema = z.object({
  id: ObjectIdSchema,
});

/** Đáp án của 1 câu hỏi */
export const KahootReviewAnswerSchema = z.object({
  id: ObjectIdSchema,
  text: z.string().nullable().optional(),
  isCorrect: z.boolean(),
  shape: AnswerShapeSchema,
  colorHex: z.string().nullable().optional(),
  orderIndex: z.number().int(),
});

/** Câu hỏi */
export const KahootReviewQuestionSchema = z.object({
  id: ObjectIdSchema,
  text: z.string().nullable().optional(),
  imageUrl: z.string().nullable().optional(),
  videoUrl: z.string().nullable().optional(),
  orderIndex: z.number().int(),
  timeLimit: z.number().int(),
  pointsMultiplier: z.number(),
  isMultipleSelect: z.boolean(),
  answers: z.array(KahootReviewAnswerSchema),
});

/** Response khi review kahoot */
export const KahootReviewResponseSchema = z.object({
  kahoot_id: ObjectIdSchema,
  title: z.string(),
  questions: z.array(KahootReviewQuestionSchema),
});

/** ====== Types ====== */
export type KahootType = z.infer<typeof KahootSchema>;
export type KahootReviewResponseType = z.infer<typeof KahootReviewResponseSchema>;
