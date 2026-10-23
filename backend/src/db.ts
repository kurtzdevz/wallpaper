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

// Executa uma função dentro de uma transação (BEGIN/COMMIT/ROLLBACK).
export async function withTransaction<T>(
  databaseUrl: string,
  fn: (client: pg.PoolClient) => Promise<T>,
): Promise<T> {
  const client = await getPool(databaseUrl).connect();
  try {
    await client.query('begin');
    const result = await fn(client);
    await client.query('commit');
    return result;
  } catch (err) {
    await client.query('rollback');
    throw err;
  } finally {
    client.release();
  }
}

export async function closePool(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
  }
}
