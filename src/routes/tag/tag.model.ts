import z from 'zod';

export const TagSchema = z.object({
  id: z.string(),
  name: z.string().min(1),
  kind: z.string().optional(),
});

export const UpsertTagsBodySchema = z.object({
  names: z.array(z.string().min(1)).min(1),
});

export const AddKahootTagBodySchema = z
  .object({
    tagId: z.string().optional(),
    name: z.string().min(1).optional(),
    kind: z.string().nullish(),
  })
  .refine((v) => !!v.tagId || !!v.name, {
    message: 'tagId hoặc name là bắt buộc',
    path: ['tagId'],
  });

export type AddKahootTagBody = z.infer<typeof AddKahootTagBodySchema>;
export type TagType = z.infer<typeof TagSchema>;
