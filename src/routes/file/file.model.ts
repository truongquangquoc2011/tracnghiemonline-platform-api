// files.model.ts
import { z } from 'zod';

// ===== Request (admin logged-in) =====
export const UploadImageReqSchema = z.object({
  usage: z.string().max(50).optional(), // VD: 'THEME_IMAGE' | 'QUESTION_IMAGE'
});
export type UploadImageReqType = z.infer<typeof UploadImageReqSchema>;

// ===== Response =====
export const UploadImageResSchema = z.object({
  message: z.string(),
  file: z.object({
    id: z.string(),
    url: z.string().url(),
    mime: z.string(),
    size: z.number().int().nonnegative(),
    createdAt: z.string(),
    usage: z.string(),
  }),
});

export const UploadThemeMusicReqSchema = z.object({
  usage: z.string().max(50).optional(),  // mặc định mình set THEME_MUSIC nếu không truyền
});

export const UploadThemeMusicResSchema = z.object({
  message: z.string(),
  file: z.object({
    id: z.string(),
    url: z.string().url(),
    mime: z.string(),
    size: z.number().int().nonnegative(),
    createdAt: z.string(),
    usage: z.string(),
  }),
});

// ====== Common item ======
export const FileItemSchema = z.object({
  id: z.string(),
  url: z.string().url(),
  mime: z.string(),
  size: z.number().int().nonnegative(),
  createdAt: z.string(),
  usage: z.string(),
});

// ===== GET list audio (global) =====
export const GetAudioListReqSchema = z.object({
  usage: z.string().max(50).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
  onlyReady: z.coerce.boolean().optional().default(true), // lọc status READY trong metaJson
});

export const GetAudioListResSchema = z.object({
  items: z.array(FileItemSchema),
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

export type UploadImageResType = z.infer<typeof UploadImageResSchema>;
export type UploadThemeMusicResType = z.infer<typeof UploadThemeMusicResSchema>;
export type GetAudioListReqType = z.infer<typeof GetAudioListReqSchema>;
export type GetAudioListResType = z.infer<typeof GetAudioListResSchema>;
