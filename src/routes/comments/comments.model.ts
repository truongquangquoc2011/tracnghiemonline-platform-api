import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export const CommentViewSchema = z.object({
  id: z.string(),
  kahootId: z.string(),
  userId: z.string(),
  content: z.string(),
  parentId: z.string().nullable(),
  createdAt: z.string(), // toISOString
  user: z
    .object({
      id: z.string(),
      name: z.string().nullable().optional(),
      email: z.string().email().nullable().optional(),
      avatarUrl: z.string().nullable().optional(),
    })
    .optional(),
});

export const CommentsListSchema = z.object({
  items: z.array(CommentViewSchema),
  total: z.number().int(),
  page: z.number().int(),
  limit: z.number().int(),
});

export class CommentsListResDTO extends createZodDto(CommentsListSchema) {}
export class CommentResDTO extends createZodDto(CommentViewSchema) {}
