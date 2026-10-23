// =====================================================================
// Contratos de domínio — compartilhados entre backend, painel web e
// (por espelhamento) o app desktop C#. Fonte única da verdade dos modelos.
// =====================================================================

export type WallpaperType = 'image' | 'video';
export type WallpaperStatus = 'draft' | 'published';
export type AdminRole = 'owner' | 'admin' | 'viewer';

export interface Category {
  id: string;
  name: string;
  slug: string;
  imagePath: string | null;
  icon: string | null;
  sortOrder: number;
  enabled: boolean;
  createdAt: string;   // ISO 8601
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  slug: string;
}

export interface Wallpaper {
  id: string;
  title: string;
  description: string | null;
  categoryId: string | null;
  category?: Pick<Category, 'id' | 'name' | 'slug'> | null;
  type: WallpaperType;
  status: WallpaperStatus;
  featured: boolean;

  // URLs públicas resolvidas (o backend converte o path do storage em URL).
  fileUrl: string;
  thumbnailUrl: string | null;

  resolutionWidth: number | null;
  resolutionHeight: number | null;
  fileSize: number | null;      // bytes
  duration: number | null;      // segundos (apenas vídeo)
  checksum: string | null;      // sha256

  downloadCount: number;
  tags: string[];               // slugs

  createdAt: string;
  updatedAt: string;
  publishedAt: string | null;
}

// Resolução formatada para exibição (ex.: "3840x2160", "4K", "Ultrawide")
export interface ResolutionInfo {
  width: number;
  height: number;
  label: string;
  is4k: boolean;
  isUltrawide: boolean;
}
