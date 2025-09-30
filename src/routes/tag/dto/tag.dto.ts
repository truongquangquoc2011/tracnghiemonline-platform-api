import { createZodDto } from 'nestjs-zod';
import { UpsertTagsBodySchema, AddKahootTagBodySchema } from '../tag.model';
import z from 'zod';

export const ListTagsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  q: z.string().optional(),        // tìm theo tên
  kind: z.string().optional(),     // lọc theo kind
  onlyUsed: z.coerce.boolean().optional().default(false), // chỉ lấy tag đang được dùng
});

export class UpsertTagsBodyDTO extends createZodDto(UpsertTagsBodySchema) {}
export class AddKahootTagBodyDTO extends createZodDto(AddKahootTagBodySchema) {}
export class ListTagsQueryDTO extends createZodDto(ListTagsQuerySchema) {}