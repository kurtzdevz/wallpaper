import { Router, type Request, type Response, type NextFunction } from 'express';
import type { Config } from '../config.ts';
import { requireAdmin } from '../auth.ts';
import {
  upsertWallpaper, setWallpaperStatus, deleteWallpaper,
  upsertCategory, deleteCategory, getStats,
} from '../repository/admin.ts';
import { listWallpapers, getWallpaperById } from '../repository/wallpapers.ts';
import { listCategories } from '../repository/categories.ts';
import { generateKeys, listKeys, revokeKey, deleteKey } from '../repository/keys.ts';
import {
  upsertWallpaperSchema, statusSchema, upsertCategorySchema, uuidParam, wallpaperQuerySchema,
  generateKeysSchema,
} from './validation.ts';

export function adminRouter(cfg: Config): Router {
  const r = Router();
  const deps = { databaseUrl: cfg.databaseUrl, storageBase: cfg.storagePublicBase };
  const wrap =
    (fn: (req: Request, res: Response) => Promise<unknown>) =>
    (req: Request, res: Response, next: NextFunction) => fn(req, res).catch(next);

  // todas as rotas admin exigem token válido + papel admin/owner
  r.use(requireAdmin({ databaseUrl: cfg.databaseUrl, jwtSecret: cfg.supabaseJwtSecret }));

  // estatísticas do dashboard
  r.get('/stats', wrap(async (_req, res) => res.json(await getStats(cfg.databaseUrl))));

  // catálogo admin (inclui rascunhos) — reusa a listagem mas sem o filtro de status
  r.get('/wallpapers', wrap(async (req, res) => {
    const parsed = wallpaperQuerySchema.safeParse(req.query);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_query', message: 'Parâmetros inválidos' });
    // admin vê tudo (inclui rascunhos)
    const result = await listWallpapers(deps, parsed.data, { includeAll: true });
    res.json(result);
  }));

  r.get('/wallpapers/:id', wrap(async (req, res) => {
    const id = uuidParam.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: 'invalid_id', message: 'ID inválido' });
    const wp = await getWallpaperById(deps, id.data, true);
    if (!wp) return res.status(404).json({ error: 'not_found', message: 'Não encontrado' });
    res.json(wp);
  }));

  r.post('/wallpapers', wrap(async (req, res) => {
    const parsed = upsertWallpaperSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_body', message: 'Dados inválidos', details: parsed.error.flatten() });
    if (!parsed.data.id && !parsed.data.filePath) {
      return res.status(400).json({ error: 'missing_file', message: 'filePath é obrigatório ao criar' });
    }
    try {
      const wp = await upsertWallpaper(deps, parsed.data);
      res.status(parsed.data.id ? 200 : 201).json(wp);
    } catch (e) {
      if ((e as Error).message === 'wallpaper_not_found') return res.status(404).json({ error: 'not_found', message: 'Não encontrado' });
      throw e;
    }
  }));

  r.post('/wallpapers/:id/status', wrap(async (req, res) => {
    const id = uuidParam.safeParse(req.params.id);
    const body = statusSchema.safeParse(req.body);
    if (!id.success || !body.success) return res.status(400).json({ error: 'invalid', message: 'Inválido' });
    const wp = await setWallpaperStatus(deps, id.data, body.data.status);
    if (!wp) return res.status(404).json({ error: 'not_found', message: 'Não encontrado' });
    res.json(wp);
  }));

  r.delete('/wallpapers/:id', wrap(async (req, res) => {
    const id = uuidParam.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: 'invalid_id', message: 'ID inválido' });
    const ok = await deleteWallpaper(cfg.databaseUrl, id.data);
    if (!ok) return res.status(404).json({ error: 'not_found', message: 'Não encontrado' });
    res.json({ ok: true });
  }));

  // categorias
  r.get('/categories', wrap(async (_req, res) => {
    res.json({ items: await listCategories(cfg.databaseUrl, true), serverTime: new Date().toISOString() });
  }));

  r.post('/categories', wrap(async (req, res) => {
    const parsed = upsertCategorySchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_body', message: 'Dados inválidos', details: parsed.error.flatten() });
    const cat = await upsertCategory(cfg.databaseUrl, parsed.data);
    res.status(parsed.data.id ? 200 : 201).json(cat);
  }));

  r.delete('/categories/:id', wrap(async (req, res) => {
    const id = uuidParam.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: 'invalid_id', message: 'ID inválido' });
    const ok = await deleteCategory(cfg.databaseUrl, id.data);
    if (!ok) return res.status(404).json({ error: 'not_found', message: 'Não encontrado' });
    res.json({ ok: true });
  }));

  // ----- Licenças (keys) -----
  r.get('/keys', wrap(async (_req, res) => res.json({ items: await listKeys(cfg.databaseUrl) })));

  r.post('/keys', wrap(async (req, res) => {
    const parsed = generateKeysSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ error: 'invalid_body', message: 'Dados inválidos', details: parsed.error.flatten() });
    const keys = await generateKeys(cfg.databaseUrl, parsed.data.count, {
      label: parsed.data.label, maxActivations: parsed.data.maxActivations,
      expiresAt: parsed.data.expiresAt ?? null,
    });
    res.status(201).json({ items: keys });
  }));

  r.post('/keys/:id/revoke', wrap(async (req, res) => {
    const id = uuidParam.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: 'invalid_id', message: 'ID inválido' });
    const ok = await revokeKey(cfg.databaseUrl, id.data);
    if (!ok) return res.status(404).json({ error: 'not_found', message: 'Não encontrado' });
    res.json({ ok: true });
  }));

  r.delete('/keys/:id', wrap(async (req, res) => {
    const id = uuidParam.safeParse(req.params.id);
    if (!id.success) return res.status(400).json({ error: 'invalid_id', message: 'ID inválido' });
    const ok = await deleteKey(cfg.databaseUrl, id.data);
    if (!ok) return res.status(404).json({ error: 'not_found', message: 'Não encontrado' });
    res.json({ ok: true });
  }));

  return r;
}
