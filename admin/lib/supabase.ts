'use client';
import { createClient } from '@supabase/supabase-js';

// Cliente do navegador (sessão do admin logado). RLS garante que só admin escreve.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(url, anon, {
  auth: { persistSession: true, autoRefreshToken: true },
});

export const BUCKET = 'wallpapers';

export function publicUrl(path: string | null): string | null {
  if (!path) return null;
  if (/^https?:\/\//.test(path)) return path;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
}
