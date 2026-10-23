import type { Category } from '@wallpaper/shared';
import { query } from '../db.ts';

interface CategoryRow {
  id: string;
  name: string;
  slug: string;
  image_path: string | null;
  icon: string | null;
  sort_order: number;
  enabled: boolean;
  created_at: Date | string;
  updated_at: Date | string;
}

const iso = (d: Date | string): string =>
  d instanceof Date ? d.toISOString() : new Date(d).toISOString();

function map(r: CategoryRow): Category {
  return {
    id: r.id,
    name: r.name,
    slug: r.slug,
    imagePath: r.image_path,
    icon: r.icon,
    sortOrder: r.sort_order,
    enabled: r.enabled,
    createdAt: iso(r.created_at),
    updatedAt: iso(r.updated_at),
  };
}

export async function listCategories(
  databaseUrl: string,
  includeDisabled = false,
): Promise<Category[]> {
  const sql = `select * from categories ${includeDisabled ? '' : 'where enabled = true'}
               order by sort_order asc, name asc`;
  const res = await query<CategoryRow>(databaseUrl, sql);
  return res.rows.map(map);
}
