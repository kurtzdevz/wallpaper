import type {
  UpsertWallpaperRequest,
  UpsertCategoryRequest,
  AdminStats,
  Wallpaper,
  Category,
} from '@wallpaper/shared';
import { slugify } from '@wallpaper/shared';
import { query, withTransaction } from '../db.ts';
import { getWallpaperById, type ListDeps } from './wallpapers.ts';

// ---------- Wallpapers ----------

// Cria ou atualiza um wallpaper + sincroniza tags (cria as que faltam). Atômico.
export async function upsertWallpaper(
  deps: ListDeps,
  input: UpsertWallpaperRequest,
): Promise<Wallpaper> {
  const id = await withTransaction(deps.databaseUrl, async (c) => {
    let wallpaperId: string;

    if (input.id) {
      // update parcial — só campos enviados
      const sets: string[] = [];
      const params: unknown[] = [];
      const set = (col: string, val: unknown) => {
        params.push(val);
        sets.push(`${col} = $${params.length}`);
      };
      if (input.title !== undefined) set('title', input.title);
      if (input.description !== undefined) set('description', input.description);
      if (input.categoryId !== undefined) set('category_id', input.categoryId);
      if (input.type !== undefined) set('type', input.type);
      if (input.featured !== undefined) set('featured', input.featured);
      if (input.filePath !== undefined) set('file_path', input.filePath);
      if (input.thumbnailPath !== undefined) set('thumbnail_path', input.thumbnailPath);
      if (input.resolutionWidth !== undefined) set('resolution_width', input.resolutionWidth);
      if (input.resolutionHeight !== undefined) set('resolution_height', input.resolutionHeight);
      if (input.fileSize !== undefined) set('file_size', input.fileSize);
      if (input.duration !== undefined) set('duration', input.duration);
      if (input.checksum !== undefined) set('checksum', input.checksum);

      params.push(input.id);
      if (sets.length > 0) {
        const res = await c.query(
          `update wallpapers set ${sets.join(', ')} where id = $${params.length} returning id`,
          params,
        );
        if (res.rowCount === 0) throw new Error('wallpaper_not_found');
      }
      wallpaperId = input.id;
    } else {
      // insert — cria sempre como rascunho; publicar é ação à parte
      const res = await c.query(
        `insert into wallpapers
           (title, description, category_id, type, featured, file_path, thumbnail_path,
            resolution_width, resolution_height, file_size, duration, checksum, status)
         values ($1,$2,$3,$4,coalesce($5,false),$6,$7,$8,$9,$10,$11,$12,'draft')
         returning id`,
        [
          input.title, input.description ?? null, input.categoryId ?? null, input.type,
          input.featured ?? false, input.filePath ?? null, input.thumbnailPath ?? null,
          input.resolutionWidth ?? null, input.resolutionHeight ?? null, input.fileSize ?? null,
          input.duration ?? null, input.checksum ?? null,
        ],
      );
      wallpaperId = res.rows[0].id;
    }

    // tags (se enviadas): recria o conjunto
    if (input.tags) {
      await c.query(`delete from wallpaper_tags where wallpaper_id = $1`, [wallpaperId]);
      for (const raw of input.tags) {
        const slug = slugify(raw);
        if (!slug) continue;
        const tag = await c.query<{ id: string }>(
          `insert into tags (name, slug) values ($1,$2)
           on conflict (slug) do update set name = excluded.name
           returning id`,
          [raw.trim(), slug],
        );
        await c.query(
          `insert into wallpaper_tags (wallpaper_id, tag_id) values ($1,$2)
           on conflict do nothing`,
          [wallpaperId, tag.rows[0].id],
        );
      }
    }
    return wallpaperId;
  });

  const wp = await getWallpaperById(deps, id, true);
  if (!wp) throw new Error('wallpaper_not_found');
  return wp;
}

export async function setWallpaperStatus(
  deps: ListDeps,
  id: string,
  status: 'draft' | 'published',
): Promise<Wallpaper | null> {
  const res = await query(
    deps.databaseUrl,
    `update wallpapers set status = $2 where id = $1 returning id`,
    [id, status],
  );
  if (res.rowCount === 0) return null;
  return getWallpaperById(deps, id, true);
}

export async function deleteWallpaper(databaseUrl: string, id: string): Promise<boolean> {
  const res = await query(databaseUrl, `delete from wallpapers where id = $1`, [id]);
  return (res.rowCount ?? 0) > 0;
}

// ---------- Categorias ----------

export async function upsertCategory(
  databaseUrl: string,
  input: UpsertCategoryRequest,
): Promise<Category> {
  const slug = input.slug?.trim() || slugify(input.name);
  const res = await query<{ id: string }>(
    databaseUrl,
    `insert into categories (id, name, slug, icon, image_path, sort_order, enabled)
     values (coalesce($1, gen_random_uuid()), $2, $3, $4, $5, coalesce($6,0), coalesce($7,true))
     on conflict (id) do update set
       name = excluded.name, slug = excluded.slug, icon = excluded.icon,
       image_path = excluded.image_path, sort_order = excluded.sort_order, enabled = excluded.enabled
     returning id`,
    [input.id ?? null, input.name, slug, input.icon ?? null, input.imagePath ?? null,
     input.sortOrder ?? null, input.enabled ?? null],
  );
  const row = await query(databaseUrl,
    `select id,name,slug,image_path,icon,sort_order,enabled,created_at,updated_at
     from categories where id = $1`, [res.rows[0].id]);
  const r = row.rows[0] as Record<string, unknown>;
  return {
    id: r.id as string, name: r.name as string, slug: r.slug as string,
    imagePath: (r.image_path as string) ?? null, icon: (r.icon as string) ?? null,
    sortOrder: r.sort_order as number, enabled: r.enabled as boolean,
    createdAt: new Date(r.created_at as string).toISOString(),
    updatedAt: new Date(r.updated_at as string).toISOString(),
  };
}

export async function deleteCategory(databaseUrl: string, id: string): Promise<boolean> {
  const res = await query(databaseUrl, `delete from categories where id = $1`, [id]);
  return (res.rowCount ?? 0) > 0;
}

// ---------- Estatísticas do dashboard ----------

export async function getStats(databaseUrl: string): Promise<AdminStats> {
  const totals = await query<{
    total: string; published: string; drafts: string; downloads: string; storage: string;
  }>(databaseUrl, `
    select
      count(*)::text as total,
      count(*) filter (where status='published')::text as published,
      count(*) filter (where status='draft')::text as drafts,
      coalesce(sum(download_count),0)::text as downloads,
      coalesce(sum(file_size),0)::text as storage
    from wallpapers`);

  const cats = await query<{ n: string }>(databaseUrl, `select count(*)::text as n from categories`);

  const top = await query<{ id: string; title: string; download_count: string }>(databaseUrl,
    `select id, title, download_count from wallpapers
     order by download_count desc limit 5`);

  const recent = await query<{ id: string; title: string; created_at: string; status: string }>(
    databaseUrl,
    `select id, title, created_at, status from wallpapers order by created_at desc limit 8`);

  const byDay = await query<{ day: string; count: string }>(databaseUrl, `
    select to_char(created_at::date,'YYYY-MM-DD') as day, count(*)::text as count
    from download_events
    where created_at > now() - interval '30 days'
    group by 1 order by 1`);

  const t = totals.rows[0];
  return {
    totalWallpapers: Number(t.total),
    published: Number(t.published),
    drafts: Number(t.drafts),
    totalDownloads: Number(t.downloads),
    categoriesCount: Number(cats.rows[0].n),
    storageBytes: Number(t.storage),
    topDownloaded: top.rows.map((r) => ({
      id: r.id, title: r.title, downloadCount: Number(r.download_count),
    })),
    recentUploads: recent.rows.map((r) => ({
      id: r.id, title: r.title,
      createdAt: new Date(r.created_at).toISOString(),
      status: r.status as Wallpaper['status'],
    })),
    downloadsByDay: byDay.rows.map((r) => ({ day: r.day, count: Number(r.count) })),
  };
}
