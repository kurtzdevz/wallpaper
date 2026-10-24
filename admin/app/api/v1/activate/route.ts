import { serverClient } from '@/lib/supabaseServer';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  const sb = serverClient();
  let body: any;
  try { body = await req.json(); } catch { return Response.json({ error: 'invalid_body', message: 'JSON inválido' }, { status: 400 }); }
  if (!body?.key || !body?.deviceHash)
    return Response.json({ error: 'invalid_body', message: 'key e deviceHash obrigatórios' }, { status: 400 });

  const { data, error } = await sb.rpc('activate_license', {
    p_key: body.key, p_device: body.deviceHash, p_device_name: body.deviceName ?? null,
  });
  if (error) return Response.json({ error: 'rpc', message: error.message }, { status: 500 });

  if (!data?.ok) {
    const msg: Record<string, string> = {
      invalid: 'Chave inválida', revoked: 'Chave revogada',
      expired: 'Chave expirada', limit: 'Limite de ativações atingido',
    };
    return Response.json({ ok: false, error: data?.reason, message: msg[data?.reason] ?? 'Falha na ativação' }, { status: 403 });
  }
  return Response.json(data);
}
