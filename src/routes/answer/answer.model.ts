import z from 'zod';

export const AnswerSchema = z.object({
  id: z.string(),
  questionId: z.string(),
  text: z.string().min(1),
  isCorrect: z.boolean().default(false),
  shape: z.string().optional(),     // FE hiển thị
  colorHex: z.string().optional(),  // FE hiển thị
  orderIndex: z.number().int().min(0),
  // createdAt/updatedAt nếu bạn có map từ DB thì thêm:
  // createdAt: z.date(),
  // updatedAt: z.date(),
});

export const CreateAnswerBodySchema = AnswerSchema.pick({
  text: true, isCorrect: true, shape: true, colorHex: true, orderIndex: true,
});

export const UpdateAnswerBodySchema = CreateAnswerBodySchema.partial();

export type AnswerType = z.infer<typeof AnswerSchema>;
