import type { WallpaperQuery, WallpaperListResponse, Wallpaper } from '@wallpaper/shared';
import { query } from '../db.ts';
import { mapWallpaper, type WallpaperRow } from '../mappers.ts';

const BASE_SELECT = `
  select w.id, w.title, w.description, w.category_id,
         c.name as category_name, c.slug as category_slug,
         w.type, w.status, w.featured, w.file_path, w.thumbnail_path,
         w.resolution_width, w.resolution_height, w.file_size, w.duration,
         w.checksum, w.download_count, w.created_at, w.updated_at, w.published_at,
         coalesce(array_agg(t.slug) filter (where t.slug is not null), '{}') as tags
  from wallpapers w
  left join categories c on c.id = w.category_id
  left join wallpaper_tags wt on wt.wallpaper_id = w.id
  left join tags t on t.id = wt.tag_id
`;

const GROUP = ` group by w.id, c.name, c.slug `;

function clampPageSize(n: number | undefined): number {
  const v = Number(n ?? 24);
  return Math.min(Math.max(Number.isFinite(v) ? v : 24, 1), 60);
}

export interface ListDeps {
  databaseUrl: string;
  storageBase: string;
}

// Lista o catálogo público (apenas 'published'), com filtros, busca e paginação.
export async function listWallpapers(
  deps: ListDeps,
  q: WallpaperQuery,
): Promise<WallpaperListResponse> {
  const where: string[] = [`w.status = 'published'`];
  const params: unknown[] = [];
  const p = (v: unknown) => `$${params.push(v)}`;

  if (q.category) where.push(`c.slug = ${p(q.category)}`);
  if (q.type && q.type !== 'all') where.push(`w.type = ${p(q.type)}`);
  if (q.featured) where.push(`w.featured = true`);
  if (q.minWidth) where.push(`w.resolution_width >= ${p(Number(q.minWidth))}`);
  if (q.since) where.push(`w.updated_at > ${p(q.since)}`);
  if (q.search) {
    const s = `%${q.search.trim()}%`;
    where.push(
      `(w.title ilike ${p(s)} or w.description ilike ${p(s)} or exists (
         select 1 from wallpaper_tags wt2 join tags t2 on t2.id = wt2.tag_id
         where wt2.wallpaper_id = w.id and t2.slug ilike ${p(s)}))`,
    );
  }
  // filtro por tag específica (slug)
  if (q.tag) {
    where.push(
      `exists (select 1 from wallpaper_tags wt3 join tags t3 on t3.id = wt3.tag_id
               where wt3.wallpaper_id = w.id and t3.slug = ${p(q.tag)})`,
    );
  }

  const whereSql = `where ${where.join(' and ')}`;
  const order =
    q.sort === 'popular'
      ? 'w.download_count desc, w.published_at desc'
      : q.sort === 'oldest'
        ? 'w.published_at asc'
        : 'w.published_at desc';

  const pageSize = clampPageSize(q.pageSize);
  const page = Math.max(Number(q.page ?? 1), 1);
  const offset = (page - 1) * pageSize;

  // total (sem agrupar)
  const countSql = `
    select count(distinct w.id)::int as total
    from wallpapers w
    left join categories c on c.id = w.category_id
    ${whereSql}`;
  const countRes = await query<{ total: number }>(deps.databaseUrl, countSql, params);
  const total = countRes.rows[0]?.total ?? 0;

  const listSql = `${BASE_SELECT} ${whereSql} ${GROUP}
    order by ${order}
    limit ${p(pageSize)} offset ${p(offset)}`;
  const rows = await query<WallpaperRow>(deps.databaseUrl, listSql, params);

  const items: Wallpaper[] = rows.rows.map((r) => mapWallpaper(r, deps.storageBase));
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);

  return {
    items,
    page,
    pageSize,
    total,
    totalPages,
    hasMore: page < totalPages,
    serverTime: new Date().toISOString(),
  };
}

// Detalhe por id. includeDrafts=true só para contexto admin.
export async function getWallpaperById(
  deps: ListDeps,
  id: string,
  includeDrafts = false,
): Promise<Wallpaper | null> {
  const params: unknown[] = [id];
  const statusClause = includeDrafts ? '' : ` and w.status = 'published'`;
  const sql = `${BASE_SELECT} where w.id = $1${statusClause} ${GROUP}`;
  const res = await query<WallpaperRow>(deps.databaseUrl, sql, params);
  const row = res.rows[0];
  return row ? mapWallpaper(row, deps.storageBase) : null;
}
