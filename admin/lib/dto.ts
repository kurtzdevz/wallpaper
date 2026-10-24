import { storagePublicUrl } from './supabaseServer';

// Mapeia uma linha de wallpaper (com joins) para o DTO que o app desktop espera.
export function mapWallpaper(row: any, supabaseUrl: string) {
  const tags = Array.isArray(row.wallpaper_tags)
    ? row.wallpaper_tags.map((wt: any) => wt?.tags?.slug).filter(Boolean)
    : [];
  const cat = row.categories ?? null;
  return {
    id: row.id,
    title: row.title,
    description: row.description ?? null,
    categoryId: row.category_id ?? null,
    category: cat ? { id: cat.id, name: cat.name, slug: cat.slug } : null,
    type: row.type,
    status: row.status,
    featured: !!row.featured,
    fileUrl: storagePublicUrl(supabaseUrl, row.file_path),
    thumbnailUrl: storagePublicUrl(supabaseUrl, row.thumbnail_path),
    resolutionWidth: row.resolution_width ?? null,
    resolutionHeight: row.resolution_height ?? null,
    fileSize: row.file_size ?? null,
    duration: row.duration ?? null,
    downloadCount: Number(row.download_count ?? 0),
    tags,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    publishedAt: row.published_at ?? null,
  };
}

export const SELECT_WP = '*, categories(id,name,slug), wallpaper_tags(tags(slug))';
