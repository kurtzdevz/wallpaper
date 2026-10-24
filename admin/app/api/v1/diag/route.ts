import { serverClient } from '@/lib/supabaseServer';
import { SELECT_WP } from '@/lib/dto';

export const dynamic = 'force-dynamic';

// Diagnóstico temporário — remover depois.
export async function GET() {
  const sb = serverClient();

  const base = await sb.from('wallpapers').select(SELECT_WP, { count: 'exact' }).eq('status', 'published');
  const ordered = await sb.from('wallpapers').select(SELECT_WP, { count: 'exact' }).eq('status', 'published')
    .order('published_at', { ascending: false });
  const ranged = await sb.from('wallpapers').select(SELECT_WP, { count: 'exact' }).eq('status', 'published')
    .range(0, 23);
  const full = await sb.from('wallpapers').select(SELECT_WP, { count: 'exact' }).eq('status', 'published')
    .order('published_at', { ascending: false }).range(0, 23);
  const fullCreated = await sb.from('wallpapers').select(SELECT_WP, { count: 'exact' }).eq('status', 'published')
    .order('created_at', { ascending: false }).range(0, 23);

  return Response.json({
    baseCount: base.count, baseErr: base.error?.message ?? null,
    orderedCount: ordered.count, orderedErr: ordered.error?.message ?? null,
    rangedCount: ranged.count, rangedErr: ranged.error?.message ?? null,
    fullCount: full.count, fullErr: full.error?.message ?? null,
    fullCreatedCount: fullCreated.count, fullCreatedErr: fullCreated.error?.message ?? null,
    publishedAtSample: (base.data ?? []).map((r: any) => ({ t: r.title, p: r.published_at })),
  });
}
