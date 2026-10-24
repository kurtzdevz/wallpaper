import { serverClient } from '@/lib/supabaseServer';
import { mapWallpaper, SELECT_WP } from '@/lib/dto';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const sb = serverClient();
  const q = new URL(req.url).searchParams;

  const page = Math.max(parseInt(q.get('page') ?? '1', 10) || 1, 1);
  const pageSize = Math.min(Math.max(parseInt(q.get('pageSize') ?? '24', 10) || 24, 1), 60);
  const type = q.get('type');
  const sort = q.get('sort') ?? 'recent';
  const search = q.get('search');
  const minWidth = q.get('minWidth');
  const categorySlug = q.get('category');
  const from = (page - 1) * pageSize;

  let query = sb.from('wallpapers').select(SELECT_WP, { count: 'exact' }).eq('status', 'published');

  if (categorySlug) {
    const cat = await sb.from('categories').select('id').eq('slug', categorySlug).maybeSingle();
    if (cat.data) query = query.eq('category_id', cat.data.id);
    else return Response.json({ items: [], page, pageSize, total: 0, totalPages: 1, hasMore: false, serverTime: new Date().toISOString() });
  }
  if (type && type !== 'all') query = query.eq('type', type);
  if (minWidth) query = query.gte('resolution_width', parseInt(minWidth, 10) || 0);
  if (search) query = query.or(`title.ilike.%${search}%,description.ilike.%${search}%`);

  // Ordena por created_at (estável, NOT NULL). Evita um bug do PostgREST ao
  // combinar order por published_at (nullable) com range/count.
  if (sort === 'popular') query = query.order('download_count', { ascending: false }).order('created_at', { ascending: false });
  else if (sort === 'oldest') query = query.order('created_at', { ascending: true });
  else query = query.order('created_at', { ascending: false });

  query = query.range(from, from + pageSize - 1);

  const { data, count, error } = await query;
  if (error) return Response.json({ error: 'query', message: error.message }, { status: 500 });

  const total = count ?? 0;
  const totalPages = Math.max(Math.ceil(total / pageSize), 1);
  return Response.json({
    items: (data ?? []).map((r) => mapWallpaper(r, url)),
    page, pageSize, total, totalPages, hasMore: page < totalPages,
    serverTime: new Date().toISOString(),
  });
}
