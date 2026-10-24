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

export const upsertWallpaperSchema = z.object({
  id: z.string().uuid().optional(),
  title: z.string().min(1).max(200),
  description: z.string().max(4000).nullish(),
  categoryId: z.string().uuid().nullish(),
  type: z.enum(['image', 'video']),
  featured: z.boolean().optional(),
  tags: z.array(z.string().min(1).max(80)).max(30).optional(),
  filePath: z.string().min(1).max(500).optional(),
  thumbnailPath: z.string().max(500).nullish(),
  resolutionWidth: z.number().int().positive().nullish(),
  resolutionHeight: z.number().int().positive().nullish(),
  fileSize: z.number().int().nonnegative().nullish(),
  duration: z.number().nonnegative().nullish(),
  checksum: z.string().max(128).nullish(),
});

export const statusSchema = z.object({ status: z.enum(['draft', 'published']) });

export const activateSchema = z.object({
  key: z.string().min(6).max(40),
  deviceHash: z.string().min(6).max(128),
  deviceName: z.string().max(120).optional(),
});

export const generateKeysSchema = z.object({
  count: z.coerce.number().int().min(1).max(500).default(1),
  label: z.string().max(200).optional(),
  maxActivations: z.coerce.number().int().min(1).max(100).default(1),
  expiresAt: z.string().datetime().nullish(),
});

export const upsertCategorySchema = z.object({
  id: z.string().uuid().optional(),
  name: z.string().min(1).max(80),
  slug: z.string().min(1).max(80).optional(),
  icon: z.string().max(60).nullish(),
  imagePath: z.string().max(500).nullish(),
  sortOrder: z.number().int().optional(),
  enabled: z.boolean().optional(),
});
