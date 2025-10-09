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

// ====== GET list by usage ======
export const GetAudioByUsageReqSchema = z.object({
  usage: z.string().max(50),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(20),
});

export const GetAudioByUsageResSchema = z.object({
  items: z.array(FileItemSchema),
  page: z.number().int(),
  limit: z.number().int(),
  total: z.number().int(),
  totalPages: z.number().int(),
});

// ====== GET latest by usage ======
export const GetLatestAudioByUsageResSchema = z.object({
  file: FileItemSchema,
});


export type UploadImageResType = z.infer<typeof UploadImageResSchema>;
export type UploadThemeMusicResType = z.infer<typeof UploadThemeMusicResSchema>;
export type GetAudioByUsageReqType = z.infer<typeof GetAudioByUsageReqSchema>;
export type GetAudioByUsageResType = z.infer<typeof GetAudioByUsageResSchema>;
export type GetLatestAudioByUsageResType = z.infer<typeof GetLatestAudioByUsageResSchema>;