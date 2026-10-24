import express, { type Express, type Request, type Response, type NextFunction } from 'express';
import type { Config } from '../config.ts';
import { listWallpapers, getWallpaperById } from '../repository/wallpapers.ts';
import { listCategories } from '../repository/categories.ts';
import { registerDownload } from '../repository/downloads.ts';
import { wallpaperQuerySchema, registerDownloadSchema, uuidParam, activateSchema } from './validation.ts';
import { rateLimit } from './rateLimit.ts';
import { adminRouter } from './adminRoutes.ts';
import { activate } from '../repository/keys.ts';

export function createApp(cfg: Config): Express {
  const app = express();
  app.use(express.json({ limit: '1mb' }));
  app.set('trust proxy', true);
  app.use('/api/', rateLimit(cfg.rateLimitPerMinute));

  const deps = { databaseUrl: cfg.databaseUrl, storageBase: cfg.storagePublicBase };
  const wrap =
    (fn: (req: Request, res: Response) => Promise<unknown>) =>
    (req: Request, res: Response, next: NextFunction) =>
      fn(req, res).catch(next);

  app.get('/api/v1/health', (_req, res) => res.json({ ok: true, version: 'v1' }));

  // --- Catálogo público ---
  app.get(
    '/api/v1/wallpapers',
    wrap(async (req, res) => {
      const parsed = wallpaperQuerySchema.safeParse(req.query);
      if (!parsed.success) {
        return res.status(400).json({ error: 'invalid_query', message: 'Parâmetros inválidos', details: parsed.error.flatten() });
      }
      const result = await listWallpapers(deps, parsed.data);
      res.json(result);
    }),
  );

  app.get(
    '/api/v1/wallpapers/:id',
    wrap(async (req, res) => {
      const id = uuidParam.safeParse(req.params.id);
      if (!id.success) return res.status(400).json({ error: 'invalid_id', message: 'ID inválido' });
      const wp = await getWallpaperById(deps, id.data);
      if (!wp) return res.status(404).json({ error: 'not_found', message: 'Wallpaper não encontrado' });
      res.json(wp);
    }),
  );

  // --- Categorias ---
  app.get(
    '/api/v1/categories',
    wrap(async (_req, res) => {
      const items = await listCategories(cfg.databaseUrl);
      res.json({ items, serverTime: new Date().toISOString() });
    }),
  );

  // --- Registro de download ---
  app.post(
    '/api/v1/downloads',
    wrap(async (req, res) => {
      const parsed = registerDownloadSchema.safeParse(req.body);
      if (!parsed.success) {
        return res.status(400).json({ error: 'invalid_body', message: 'Corpo inválido', details: parsed.error.flatten() });
      }
      const result = await registerDownload(
        { databaseUrl: cfg.databaseUrl, dedupeWindowHours: cfg.downloadDedupeWindowHours },
        parsed.data.wallpaperId,
        parsed.data.clientHash,
      );
      if (!result.ok) return res.status(404).json({ error: 'not_found', message: 'Wallpaper não encontrado ou não publicado' });
      res.json(result);
    }),
  );

  // --- Ativação de licença (público, usado pelo app desktop) ---
  app.post(
    '/api/v1/activate',
    wrap(async (req, res) => {
      const parsed = activateSchema.safeParse(req.body);
      if (!parsed.success) return res.status(400).json({ error: 'invalid_body', message: 'Dados inválidos' });
      const result = await activate(cfg.databaseUrl, parsed.data.key, parsed.data.deviceHash, parsed.data.deviceName);
      if (!result.ok) {
        const msg = {
          invalid: 'Chave inválida', revoked: 'Chave revogada',
          expired: 'Chave expirada', limit: 'Limite de ativações atingido',
        }[result.reason];
        return res.status(403).json({ error: result.reason, message: msg });
      }
      res.json(result);
    }),
  );

  // --- Admin (autenticado) ---
  app.use('/api/v1/admin', adminRouter(cfg));

  // 404 padrão da API
  app.use('/api/', (_req, res) => res.status(404).json({ error: 'not_found', message: 'Rota não encontrada' }));

  // erro genérico
  app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
    // eslint-disable-next-line no-console
    console.error('[api error]', err);
    res.status(500).json({ error: 'internal', message: 'Erro interno' });
  });

  return app;
}
