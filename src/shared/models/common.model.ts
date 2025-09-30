import z from 'zod';

// Visibility theo DB
export const VisibilitySchema = z.enum(['private', 'unlisted', 'public']);

// (Tuỳ chọn) Nếu cần status nội bộ thì để ở view khác, KHÔNG đưa vào DTO ghi DB.
// export const PublishStatusSchema = z.enum(['draft','published','archived']);
