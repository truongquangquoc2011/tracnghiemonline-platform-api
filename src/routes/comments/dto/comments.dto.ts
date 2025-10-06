import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

// ===== Common =====
export const CommentIdSchema = z.object({
  id: z.string().min(1, 'commentId is required'),
});

export const KahootParamSchema = z.object({
  kahoot_id: z.string().regex(/^[a-f0-9]{24}$/i, 'Invalid ObjectId'),
});
export class KahootParamDTO extends createZodDto(KahootParamSchema) {}

// ===== Create =====
export const CreateCommentBodySchema = z.object({
  content: z.string().min(1).max(10_000),
  parentId: z.string().min(1).optional(), // reply optional
});
export class CreateCommentBodyDTO extends createZodDto(CreateCommentBodySchema) {}

// ===== Update =====
export const UpdateCommentBodySchema = z.object({
  content: z.string().min(1).max(10_000),
});
export class UpdateCommentBodyDTO extends createZodDto(UpdateCommentBodySchema) {}

// ===== List (GET query) =====
export const ListCommentsQuerySchema = z.object({
  parentId: z.string().min(1).optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['newest', 'oldest']).default('newest'),
});
export class ListCommentsQueryDTO extends createZodDto(ListCommentsQuerySchema) {}
