// answer.model.ts
import z from 'zod';
import { AnswerShape } from '@prisma/client';

export const AnswerSchema = z.object({
  id: z.string(),
  questionId: z.string(),
  text: z.string().min(1),
  isCorrect: z.boolean().default(false),
  shape: z.nativeEnum(AnswerShape).nullable().optional(),
  colorHex: z.string().nullable().optional(),
  orderIndex: z.number().int().min(0),
});

export const CreateAnswerBodySchema = AnswerSchema.pick({
  text: true, isCorrect: true, shape: true, colorHex: true, orderIndex: true,
});

export const UpdateAnswerBodySchema = CreateAnswerBodySchema.partial();
