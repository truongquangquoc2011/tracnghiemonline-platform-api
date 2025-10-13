import z from 'zod';
import { VisibilitySchema } from 'src/shared/models/common.model';

// ✅ Schema cho MongoDB ObjectId
const ObjectIdSchema = z
  .string()
  .regex(/^[0-9a-f]{24}$/i, 'Phải là ObjectId hợp lệ của MongoDB');

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

export const ListKahootQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),
  visibility: VisibilitySchema.optional(),
  tagId: z.string().optional(),
  q: z.string().optional(),
});

export const CreateKahootBodySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  visibility: VisibilitySchema.optional(),
  theme: z.string().optional(),
  musicTheme: ObjectIdSchema.optional().nullable(), 
  isTeamModeOk: z.boolean().optional(),
});

export const UpdateKahootBodySchema = CreateKahootBodySchema.partial();

export type KahootType = z.infer<typeof KahootSchema>;
