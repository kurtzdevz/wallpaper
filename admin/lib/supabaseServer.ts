import { createClient } from '@supabase/supabase-js';

// Cliente de servidor com service_role (ignora RLS). Só use em route handlers.
// Nunca exponha a service key ao cliente.
export function serverClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  return createClient(url, service, { auth: { persistSession: false } });
}

export const BUCKET = 'wallpapers';

export function storagePublicUrl(url: string, path: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return `${url.replace(/\/$/, '')}/storage/v1/object/public/${BUCKET}/${path.replace(/^\/+/, '')}`;
}
