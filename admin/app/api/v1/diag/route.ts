import { serverClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

// Diagnóstico temporário — remover depois.
export async function GET() {
  const sb = serverClient();
  const all = await sb.from('wallpapers').select('id,title,status', { count: 'exact' });
  const pub = await sb.from('wallpapers').select('id', { count: 'exact', head: true }).eq('status', 'published');
  const embed = await sb.from('wallpapers')
    .select('*, categories(id,name,slug), wallpaper_tags(tags(slug))', { count: 'exact' })
    .eq('status', 'published');

  return Response.json({
    allCount: all.count, allError: all.error?.message ?? null,
    sample: (all.data ?? []).slice(0, 5),
    pubCount: pub.count, pubError: pub.error?.message ?? null,
    embedCount: embed.count, embedError: embed.error?.message ?? null,
    projectHost: (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace(/^https?:\/\//, '').split('.')[0],
    hasServiceKey: !!process.env.SUPABASE_SERVICE_ROLE_KEY,
    serviceKeyIsJwt: (process.env.SUPABASE_SERVICE_ROLE_KEY || '').startsWith('eyJ'),
  });
}
