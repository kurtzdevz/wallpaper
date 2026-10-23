import type { Wallpaper } from '@wallpaper/shared';

// Linha crua do join de wallpapers (snake_case vindo do Postgres).
export interface WallpaperRow {
  id: string;
  title: string;
  description: string | null;
  category_id: string | null;
  category_name: string | null;
  category_slug: string | null;
  type: 'image' | 'video';
  status: 'draft' | 'published';
  featured: boolean;
  file_path: string;
  thumbnail_path: string | null;
  resolution_width: number | null;
  resolution_height: number | null;
  file_size: string | number | null; // bigint vem como string no pg
  duration: string | number | null;
  checksum: string | null;
  download_count: string | number;
  tags: string[] | null;
  created_at: Date | string;
  updated_at: Date | string;
  published_at: Date | string | null;
}

const iso = (d: Date | string | null): string | null =>
  d == null ? null : (d instanceof Date ? d.toISOString() : new Date(d).toISOString());

const num = (v: string | number | null): number | null =>
  v == null ? null : typeof v === 'number' ? v : Number(v);

// Monta a URL pública do storage a partir do path salvo (bucket/key).
function publicUrl(base: string, path: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//i.test(path)) return path; // já é URL absoluta
  return `${base}/${path.replace(/^\/+/, '')}`;
}

export function mapWallpaper(row: WallpaperRow, storageBase: string): Wallpaper {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    categoryId: row.category_id,
    category: row.category_id
      ? { id: row.category_id, name: row.category_name ?? '', slug: row.category_slug ?? '' }
      : null,
    type: row.type,
    status: row.status,
    featured: row.featured,
    fileUrl: publicUrl(storageBase, row.file_path)!,
    thumbnailUrl: publicUrl(storageBase, row.thumbnail_path),
    resolutionWidth: num(row.resolution_width),
    resolutionHeight: num(row.resolution_height),
    fileSize: num(row.file_size),
    duration: num(row.duration),
    checksum: row.checksum,
    downloadCount: num(row.download_count) ?? 0,
    tags: row.tags ?? [],
    createdAt: iso(row.created_at)!,
    updatedAt: iso(row.updated_at)!,
    publishedAt: iso(row.published_at),
  };
}
