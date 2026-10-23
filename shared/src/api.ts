// =====================================================================
// Contratos da API — parâmetros de requisição e formatos de resposta.
// Versionada em /api/v1. Usada pelo app desktop e pelo painel.
// =====================================================================

import type { Wallpaper, Category, WallpaperType } from './types.js';

export const API_VERSION = 'v1';

export type WallpaperSort =
  | 'recent'      // published_at desc
  | 'popular'     // download_count desc
  | 'oldest';

export interface WallpaperQuery {
  page?: number;              // 1-based
  pageSize?: number;          // default 24, max 60
  category?: string;          // slug
  type?: WallpaperType | 'all';
  tag?: string;               // slug
  search?: string;            // título/descrição/tags
  sort?: WallpaperSort;
  featured?: boolean;
  minWidth?: number;          // p/ filtros 4K/ultrawide
  since?: string;             // ISO — catálogo incremental (updated_at > since)
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  hasMore: boolean;
  serverTime: string;         // ISO — âncora p/ próximo `since`
}

export type WallpaperListResponse = Paginated<Wallpaper>;

export interface CategoryListResponse {
  items: Category[];
  serverTime: string;
}

export interface RegisterDownloadRequest {
  wallpaperId: string;
  clientHash?: string;        // hash anônimo e estável do cliente (dedupe)
}

export interface RegisterDownloadResponse {
  ok: boolean;
  counted: boolean;           // false se deduplicado na janela anti-abuso
  downloadCount: number;
}

// ---- Admin (autenticado) ----
export interface UpsertWallpaperRequest {
  id?: string;
  title: string;
  description?: string | null;
  categoryId?: string | null;
  type: WallpaperType;
  featured?: boolean;
  tags?: string[];            // slugs; criados se não existirem
  // arquivo e thumbnail são enviados por upload separado; aqui vão os paths.
  filePath?: string;
  thumbnailPath?: string | null;
  resolutionWidth?: number | null;
  resolutionHeight?: number | null;
  fileSize?: number | null;
  duration?: number | null;
  checksum?: string | null;
}

export interface UpsertCategoryRequest {
  id?: string;
  name: string;
  slug?: string;              // derivado do name se ausente
  icon?: string | null;
  imagePath?: string | null;
  sortOrder?: number;
  enabled?: boolean;
}

export interface AdminStats {
  totalWallpapers: number;
  published: number;
  drafts: number;
  totalDownloads: number;
  categoriesCount: number;
  storageBytes: number;
  topDownloaded: Array<Pick<Wallpaper, 'id' | 'title' | 'downloadCount'>>;
  recentUploads: Array<Pick<Wallpaper, 'id' | 'title' | 'createdAt' | 'status'>>;
  downloadsByDay: Array<{ day: string; count: number }>;
}

export interface ApiError {
  error: string;
  message: string;
  details?: unknown;
}

// Limites de upload aplicados no servidor (também espelhados no cliente).
export const UPLOAD_LIMITS = {
  image: { maxBytes: 50 * 1024 * 1024, mime: ['image/jpeg', 'image/png', 'image/webp', 'image/bmp'] },
  video: { maxBytes: 500 * 1024 * 1024, mime: ['video/mp4', 'video/webm'] },
} as const;
