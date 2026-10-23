import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import pg from 'pg';
import { createApp } from './app.ts';
import { closePool } from '../db.ts';
import { makeJwt } from '../testutil.ts';
import type { Config } from '../config.ts';

const DATABASE_URL = process.env.DATABASE_URL;
const run = DATABASE_URL ? test : test.skip;

const SECRET = 'test-secret';
const ADMIN_ID = '11111111-1111-1111-1111-111111111111';
const USER_ID = '22222222-2222-2222-2222-222222222222';

const cfg: Config = {
  databaseUrl: DATABASE_URL ?? '',
  supabaseUrl: 'http://localhost',
  supabaseAnonKey: 'anon',
  supabaseJwtSecret: SECRET,
  storageBucket: 'wallpapers',
  storagePublicBase: 'http://storage.local/wallpapers',
  downloadDedupeWindowHours: 24,
  rateLimitPerMinute: 100000,
  port: 0,
};

let server: ReturnType<ReturnType<typeof createApp>['listen']>;
let base = '';
let catId = '';
const adminToken = makeJwt(ADMIN_ID, SECRET);
const userToken = makeJwt(USER_ID, SECRET);

const authFetch = (path: string, token: string, init: RequestInit = {}) =>
  fetch(`${base}${path}`, {
    ...init,
    headers: { 'content-type': 'application/json', authorization: `Bearer ${token}`, ...(init.headers ?? {}) },
  });

before(async () => {
  if (!DATABASE_URL) return;
  const c = new pg.Client({ connectionString: DATABASE_URL });
  await c.connect();
  await c.query(`truncate wallpaper_tags, download_events, wallpapers, tags, categories, admin_profiles restart identity cascade`);
  await c.query(`insert into admin_profiles(id, role) values ($1,'owner')`, [ADMIN_ID]);
  // USER_ID NÃO é admin (teste de 403)
  const cat = await c.query(`insert into categories(name,slug) values('Anime','anime') returning id`);
  catId = cat.rows[0].id;
  await c.end();

  const app = createApp(cfg);
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
});

after(async () => {
  if (server) await new Promise((r) => server.close(r));
  await closePool();
});

run('sem token: 401', async () => {
  const r = await fetch(`${base}/api/v1/admin/stats`);
  assert.equal(r.status, 401);
});

run('token de não-admin: 403', async () => {
  const r = await authFetch('/api/v1/admin/stats', userToken);
  assert.equal(r.status, 403);
});

run('fluxo completo: criar rascunho → não aparece no público → publicar → aparece', async () => {
  // cria
  const created = await authFetch('/api/v1/admin/wallpapers', adminToken, {
    method: 'POST',
    body: JSON.stringify({
      title: 'Naruto 4K', type: 'video', categoryId: catId,
      filePath: 'wallpapers/naruto.mp4', tags: ['Anime', 'Ação'],
      resolutionWidth: 3840, resolutionHeight: 2160,
    }),
  });
  assert.equal(created.status, 201);
  const wp = await created.json();
  assert.equal(wp.status, 'draft');
  assert.deepEqual(wp.tags.sort(), ['acao', 'anime']);

  // não aparece no catálogo público (ainda é rascunho)
  const pub1 = await (await fetch(`${base}/api/v1/wallpapers`)).json();
  assert.equal(pub1.total, 0);

  // publica
  const published = await authFetch(`/api/v1/admin/wallpapers/${wp.id}/status`, adminToken, {
    method: 'POST', body: JSON.stringify({ status: 'published' }),
  });
  assert.equal(published.status, 200);
  assert.equal((await published.json()).status, 'published');

  // agora aparece no público — CRITÉRIO DE ACEITAÇÃO (publicar → descobrir)
  const pub2 = await (await fetch(`${base}/api/v1/wallpapers`)).json();
  assert.equal(pub2.total, 1);
  assert.equal(pub2.items[0].title, 'Naruto 4K');
});

run('stats refletem o estado', async () => {
  const stats = await (await authFetch('/api/v1/admin/stats', adminToken)).json();
  assert.equal(stats.totalWallpapers, 1);
  assert.equal(stats.published, 1);
  assert.equal(stats.drafts, 0);
  assert.equal(stats.categoriesCount, 1);
});

run('editar título via upsert com id', async () => {
  const list = await (await authFetch('/api/v1/admin/wallpapers', adminToken)).json();
  const id = list.items[0].id;
  const upd = await authFetch('/api/v1/admin/wallpapers', adminToken, {
    method: 'POST', body: JSON.stringify({ id, title: 'Naruto Shippuden 4K', type: 'video' }),
  });
  assert.equal(upd.status, 200);
  assert.equal((await upd.json()).title, 'Naruto Shippuden 4K');
});

run('criar categoria e deletar', async () => {
  const created = await authFetch('/api/v1/admin/categories', adminToken, {
    method: 'POST', body: JSON.stringify({ name: 'Carros Esportivos' }),
  });
  assert.equal(created.status, 201);
  const cat = await created.json();
  assert.equal(cat.slug, 'carros-esportivos');
  const del = await authFetch(`/api/v1/admin/categories/${cat.id}`, adminToken, { method: 'DELETE' });
  assert.equal(del.status, 200);
});

run('deletar wallpaper do catálogo', async () => {
  const list = await (await authFetch('/api/v1/admin/wallpapers', adminToken)).json();
  const id = list.items[0].id;
  const del = await authFetch(`/api/v1/admin/wallpapers/${id}`, adminToken, { method: 'DELETE' });
  assert.equal(del.status, 200);
  const pub = await (await fetch(`${base}/api/v1/wallpapers`)).json();
  assert.equal(pub.total, 0);
});
