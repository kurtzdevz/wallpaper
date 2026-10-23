import pg from 'pg';

// Pool único de conexões. Em serverless (Vercel) use a connection string do
// pooler do Supabase (porta 6543). Local: Postgres normal.
let pool: pg.Pool | null = null;

export function getPool(databaseUrl: string): pg.Pool {
  if (!pool) {
    pool = new pg.Pool({
      connectionString: databaseUrl,
      max: Number(process.env.PG_POOL_MAX ?? 5),
      idleTimeoutMillis: 10_000,
      ssl: /supabase\.(co|com)/.test(databaseUrl) ? { rejectUnauthorized: false } : undefined,
    });
  }
  return pool;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  databaseUrl: string,
  text: string,
  params?: unknown[],
): Promise<pg.QueryResult<T>> {
  return getPool(databaseUrl).query<T>(text, params as never);
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
