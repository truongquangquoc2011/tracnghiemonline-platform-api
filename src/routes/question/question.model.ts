import z from 'zod';
const ObjectIdRx = /^[0-9a-f]{24}$/i;
export const QuestionSchema = z.object({
  id: z.string(),
  kahootId: z.string(),
  text: z.string().min(1),
  imageUrl: z.string().url().optional(),
  videoUrl: z.string().url().optional(),
  timeLimit: z.number().int().min(5).max(300).default(60),
  pointsMultiplier: z.number().int().min(1).max(5).default(1),
  isMultipleSelect: z.boolean().default(false),
  orderIndex: z.number().int().min(0),
  createdAt: z.date(),
  updatedAt: z.date(),
  deletedAt: z.date().nullable().optional(),
});

export const CreateQuestionBodySchema = QuestionSchema.pick({
  text: true,
  imageUrl: true,
  videoUrl: true,
  timeLimit: true,
  pointsMultiplier: true,
  isMultipleSelect: true,
}).extend({
  imageFileId: z.string().regex(ObjectIdRx).optional(),
  videoFileId: z.string().regex(ObjectIdRx).optional(),
});

export const UpdateQuestionBodySchema = CreateQuestionBodySchema.partial();

export const ReorderQuestionsBodySchema = z.object({
  order: z.array(z.object({
    id: z.string(),
    orderIndex: z.number().int().min(0),
  })).min(1),
});

export type QuestionType = z.infer<typeof QuestionSchema>;
