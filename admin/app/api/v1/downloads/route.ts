import { serverClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const sb = serverClient();
  let body: any;
  try { body = await req.json(); } catch { return Response.json({ error: 'invalid_body', message: 'JSON inválido' }, { status: 400 }); }
  if (!body?.wallpaperId) return Response.json({ error: 'invalid_body', message: 'wallpaperId obrigatório' }, { status: 400 });

  const { data, error } = await sb.rpc('register_download', {
    p_wallpaper: body.wallpaperId, p_client: body.clientHash ?? null, p_window_hours: 24,
  });
  if (error) return Response.json({ error: 'rpc', message: error.message }, { status: 500 });
  if (!data?.ok) return Response.json({ error: 'not_found', message: 'Wallpaper não encontrado' }, { status: 404 });
  return Response.json(data);
}
