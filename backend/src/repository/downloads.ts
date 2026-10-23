import type { RegisterDownloadResponse } from '@wallpaper/shared';
import { query } from '../db.ts';

export interface DownloadDeps {
  databaseUrl: string;
  dedupeWindowHours: number;
}

// Registra um download com dedupe por (wallpaper, clientHash) dentro da janela.
// Só insere (e conta, via trigger) se não houver evento recente do mesmo cliente.
export async function registerDownload(
  deps: DownloadDeps,
  wallpaperId: string,
  clientHash?: string,
): Promise<RegisterDownloadResponse> {
  // valida existência e publicação
  const exists = await query<{ download_count: string }>(
    deps.databaseUrl,
    `select download_count from wallpapers where id = $1 and status = 'published'`,
    [wallpaperId],
  );
  if (exists.rowCount === 0) {
    return { ok: false, counted: false, downloadCount: 0 };
  }

  let counted = false;
  if (clientHash) {
    // INSERT condicional: só se não existe evento na janela
    const ins = await query<{ id: string }>(
      deps.databaseUrl,
      `insert into download_events (wallpaper_id, client_hash)
       select $1, $2
       where not exists (
         select 1 from download_events
         where wallpaper_id = $1 and client_hash = $2
           and created_at > now() - ($3 || ' hours')::interval
       )
       returning id`,
      [wallpaperId, clientHash, String(deps.dedupeWindowHours)],
    );
    counted = (ins.rowCount ?? 0) > 0;
  } else {
    await query(
      deps.databaseUrl,
      `insert into download_events (wallpaper_id) values ($1)`,
      [wallpaperId],
    );
    counted = true;
  }

  const after = await query<{ download_count: string }>(
    deps.databaseUrl,
    `select download_count from wallpapers where id = $1`,
    [wallpaperId],
  );
  return {
    ok: true,
    counted,
    downloadCount: Number(after.rows[0]?.download_count ?? 0),
  };
}
