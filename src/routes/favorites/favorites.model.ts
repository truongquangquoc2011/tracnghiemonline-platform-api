// src/routes/favorites/favorites.model.ts
import { z } from 'zod';

export const ListFavoritesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  sort: z.enum(['newest', 'oldest']).default('newest'),
});
export type ListFavoritesQueryDto = z.infer<typeof ListFavoritesQuerySchema>;

export const FavoriteParamSchema = z.object({
  kahootId: z.string().min(1),
});

export const FavoriteKahootSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string().nullable().optional(),
  coverImage: z.string().nullable().optional(),
  ownerId: z.string(),
  visibility: z.string(),
  createdAt: z.preprocess((v) => new Date(v as any), z.date()),
});

export const FavoriteItemSchema = z.object({
  id: z.string(),
  userId: z.string(),
  kahootId: z.string(),
  createdAt: z.preprocess((v) => new Date(v as any), z.date()),
  kahoot: FavoriteKahootSchema,
});

export const FavoriteListResponseSchema = z.object({
  page: z.number(),
  limit: z.number(),
  total: z.number(),
  items: z.array(FavoriteItemSchema),
});
export type FavoriteListResponse = z.infer<typeof FavoriteListResponseSchema>;
