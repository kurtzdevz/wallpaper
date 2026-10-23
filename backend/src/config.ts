// Configuração via ambiente. Sem segredos hardcoded.
export interface Config {
  databaseUrl: string;
  supabaseUrl: string;
  supabaseAnonKey: string;
  storageBucket: string;
  // URL pública base do storage para montar fileUrl/thumbnailUrl.
  storagePublicBase: string;
  downloadDedupeWindowHours: number;
  rateLimitPerMinute: number;
  port: number;
}

function req(name: string, fallback?: string): string {
  const v = process.env[name] ?? fallback;
  if (v === undefined) throw new Error(`Variável de ambiente ausente: ${name}`);
  return v;
}

export function loadConfig(): Config {
  const supabaseUrl = req('SUPABASE_URL', 'http://localhost:54321');
  const bucket = process.env.STORAGE_BUCKET ?? 'wallpapers';
  return {
    databaseUrl: req('DATABASE_URL', 'postgres://postgres@localhost:5432/postgres'),
    supabaseUrl,
    supabaseAnonKey: req('SUPABASE_ANON_KEY', 'anon-dev'),
    storageBucket: bucket,
    storagePublicBase:
      process.env.STORAGE_PUBLIC_BASE ?? `${supabaseUrl}/storage/v1/object/public/${bucket}`,
    downloadDedupeWindowHours: Number(process.env.DOWNLOAD_DEDUPE_WINDOW_HOURS ?? 24),
    rateLimitPerMinute: Number(process.env.RATE_LIMIT_PER_MINUTE ?? 120),
    port: Number(process.env.PORT ?? 3001),
  };
}
