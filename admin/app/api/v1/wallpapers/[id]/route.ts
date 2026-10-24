import { serverClient } from '@/lib/supabaseServer';
import { mapWallpaper, SELECT_WP } from '@/lib/dto';

export const dynamic = 'force-dynamic';

export async function GET(_req: Request, { params }: { params: { id: string } }) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const sb = serverClient();
  const { data, error } = await sb.from('wallpapers').select(SELECT_WP)
    .eq('id', params.id).eq('status', 'published').maybeSingle();
  if (error) return Response.json({ error: 'query', message: error.message }, { status: 500 });
  if (!data) return Response.json({ error: 'not_found', message: 'Não encontrado' }, { status: 404 });
  return Response.json(mapWallpaper(data, url));
}
