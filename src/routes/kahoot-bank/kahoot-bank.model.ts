import z from 'zod';
import { VisibilitySchema } from 'src/shared/models/common.model';

export const KahootSchema = z.object({
  id: z.string(),
  ownerId: z.string(),
  title: z.string().min(1),
  description: z.string().optional(),
  coverImage: z.string().url().optional(),
  theme: z.string().optional(),
  musicTheme: z.string().optional(),
  visibility: VisibilitySchema.default('private'),
  isTeamModeOk: z.boolean().default(true),
  createdAt: z.date(),
  updatedAt: z.date(),
  publishedAt: z.date().nullable().optional(), // theo Prisma
});

export const ListKahootQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.string().optional(),       // e.g. 'createdAt:desc'
  ownerId: z.string().optional(),
  visibility: VisibilitySchema.optional(),
  tagId: z.string().optional(),
  q: z.string().optional(),
});

export const CreateKahootBodySchema = z.object({
  title: z.string().min(1),
  description: z.string().optional(),
  visibility: VisibilitySchema.optional(),
  theme: z.string().optional(),
  musicTheme: z.string().optional(),
  isTeamModeOk: z.boolean().optional(),
});

export const UpdateKahootBodySchema = CreateKahootBodySchema.partial();

export type KahootType = z.infer<typeof KahootSchema>;
