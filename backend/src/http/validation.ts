import { z } from 'zod';

export const wallpaperQuerySchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  pageSize: z.coerce.number().int().min(1).max(60).optional(),
  category: z.string().min(1).max(80).optional(),
  type: z.enum(['image', 'video', 'all']).optional(),
  tag: z.string().min(1).max(80).optional(),
  search: z.string().max(120).optional(),
  sort: z.enum(['recent', 'popular', 'oldest']).optional(),
  featured: z
    .union([z.literal('true'), z.literal('false'), z.boolean()])
    .transform((v) => v === true || v === 'true')
    .optional(),
  minWidth: z.coerce.number().int().positive().optional(),
  since: z.string().datetime().optional(),
});

export const registerDownloadSchema = z.object({
  wallpaperId: z.string().uuid(),
  clientHash: z.string().min(4).max(128).optional(),
});

export const uuidParam = z.string().uuid();
