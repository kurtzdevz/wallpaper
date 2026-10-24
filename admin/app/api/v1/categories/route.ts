import { serverClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function GET() {
  const sb = serverClient();
  const { data, error } = await sb.from('categories').select('id,name,slug,icon,sort_order,enabled,created_at,updated_at')
    .eq('enabled', true).order('sort_order').order('name');
  if (error) return Response.json({ error: 'query', message: error.message }, { status: 500 });
  const items = (data ?? []).map((c: any) => ({
    id: c.id, name: c.name, slug: c.slug, icon: c.icon ?? null,
    imagePath: null, sortOrder: c.sort_order, enabled: c.enabled,
    createdAt: c.created_at, updatedAt: c.updated_at,
  }));
  return Response.json({ items, serverTime: new Date().toISOString() });
}
