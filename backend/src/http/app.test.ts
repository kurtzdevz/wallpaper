import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import type { AddressInfo } from 'node:net';
import pg from 'pg';
import { createApp } from './app.ts';
import { closePool } from '../db.ts';
import type { Config } from '../config.ts';

const DATABASE_URL = process.env.DATABASE_URL;
const run = DATABASE_URL ? test : test.skip;

const cfg: Config = {
  databaseUrl: DATABASE_URL ?? '',
  supabaseUrl: 'http://localhost',
  supabaseAnonKey: 'anon',
  storageBucket: 'wallpapers',
  storagePublicBase: 'http://storage.local/wallpapers',
  downloadDedupeWindowHours: 24,
  rateLimitPerMinute: 100000,
  port: 0,
};

let server: ReturnType<ReturnType<typeof createApp>['listen']>;
let base = '';
let pubId = '';

before(async () => {
  if (!DATABASE_URL) return;
  const c = new pg.Client({ connectionString: DATABASE_URL });
  await c.connect();
  // limpa e semeia dados de teste
  await c.query(`truncate wallpaper_tags, download_events, wallpapers, tags, categories restart identity cascade`);
  const cat = await c.query(`insert into categories(name,slug,sort_order) values('Games','games',1) returning id`);
  const catId = cat.rows[0].id;
  const t1 = await c.query(`insert into tags(name,slug) values('Neon','neon') returning id`);
  // 1 publicado vídeo 4K com tag, 1 publicado imagem, 1 rascunho
  const w1 = await c.query(
    `insert into wallpapers(title,description,type,status,file_path,category_id,resolution_width,resolution_height)
     values('Cyber City','cidade neon','video','published','wallpapers/cyber.mp4',$1,3840,2160) returning id`,
    [catId],
  );
  pubId = w1.rows[0].id;
  await c.query(`insert into wallpaper_tags(wallpaper_id,tag_id) values($1,$2)`, [pubId, t1.rows[0].id]);
  await c.query(
    `insert into wallpapers(title,type,status,file_path,resolution_width,resolution_height)
     values('Montanha','image','published','wallpapers/mont.jpg',1920,1080)`,
  );
  await c.query(
    `insert into wallpapers(title,type,status,file_path) values('Rascunho secreto','image','draft','wallpapers/x.jpg')`,
  );
  await c.end();

  const app = createApp(cfg);
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  const addr = server.address() as AddressInfo;
  base = `http://127.0.0.1:${addr.port}`;
});

after(async () => {
  if (server) await new Promise((r) => server.close(r));
  await closePool();
});

run('health responde', async () => {
  const r = await fetch(`${base}/api/v1/health`);
  assert.equal(r.status, 200);
  assert.deepEqual(await r.json(), { ok: true, version: 'v1' });
});

run('lista só publicados (rascunho não aparece)', async () => {
  const r = await fetch(`${base}/api/v1/wallpapers`);
  const body = await r.json();
  assert.equal(r.status, 200);
  assert.equal(body.total, 2);
  const titles = body.items.map((w: any) => w.title);
  assert.ok(!titles.includes('Rascunho secreto'));
});

run('fileUrl é montada a partir do storage base', async () => {
  const r = await fetch(`${base}/api/v1/wallpapers`);
  const body = await r.json();
  const cyber = body.items.find((w: any) => w.title === 'Cyber City');
  assert.equal(cyber.fileUrl, 'http://storage.local/wallpapers/wallpapers/cyber.mp4');
  assert.deepEqual(cyber.tags, ['neon']);
});

run('filtra por type=video', async () => {
  const r = await fetch(`${base}/api/v1/wallpapers?type=video`);
  const body = await r.json();
  assert.equal(body.items.length, 1);
  assert.equal(body.items[0].type, 'video');
});

run('filtro minWidth retorna só 4K', async () => {
  const r = await fetch(`${base}/api/v1/wallpapers?minWidth=3840`);
  const body = await r.json();
  assert.equal(body.items.length, 1);
  assert.equal(body.items[0].title, 'Cyber City');
});

run('busca por texto encontra por descrição', async () => {
  const r = await fetch(`${base}/api/v1/wallpapers?search=neon`);
  const body = await r.json();
  assert.equal(body.items.length, 1);
  assert.equal(body.items[0].title, 'Cyber City');
});

run('paginação: pageSize=1 dá 2 páginas', async () => {
  const r = await fetch(`${base}/api/v1/wallpapers?pageSize=1&page=1`);
  const body = await r.json();
  assert.equal(body.items.length, 1);
  assert.equal(body.totalPages, 2);
  assert.equal(body.hasMore, true);
});

run('detalhe 200 para publicado, 404 para rascunho', async () => {
  const ok = await fetch(`${base}/api/v1/wallpapers/${pubId}`);
  assert.equal(ok.status, 200);
  // id inexistente
  const notFound = await fetch(`${base}/api/v1/wallpapers/00000000-0000-0000-0000-000000000000`);
  assert.equal(notFound.status, 404);
});

run('query inválida retorna 400', async () => {
  const r = await fetch(`${base}/api/v1/wallpapers?type=banana`);
  assert.equal(r.status, 400);
});

run('categorias lista só habilitadas', async () => {
  const r = await fetch(`${base}/api/v1/categories`);
  const body = await r.json();
  assert.equal(body.items.length, 1);
  assert.equal(body.items[0].slug, 'games');
});

run('registrar download conta e deduplica', async () => {
  const body1 = await (await fetch(`${base}/api/v1/downloads`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ wallpaperId: pubId, clientHash: 'cliente-abc' }),
  })).json();
  assert.equal(body1.counted, true);
  assert.equal(body1.downloadCount, 1);

  // mesmo cliente de novo na janela: não conta
  const body2 = await (await fetch(`${base}/api/v1/downloads`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ wallpaperId: pubId, clientHash: 'cliente-abc' }),
  })).json();
  assert.equal(body2.counted, false);
  assert.equal(body2.downloadCount, 1);

  // cliente diferente: conta
  const body3 = await (await fetch(`${base}/api/v1/downloads`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ wallpaperId: pubId, clientHash: 'outro-cliente' }),
  })).json();
  assert.equal(body3.counted, true);
  assert.equal(body3.downloadCount, 2);
});

run('download em wallpaper inexistente dá 404', async () => {
  const r = await fetch(`${base}/api/v1/downloads`, {
    method: 'POST', headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ wallpaperId: '00000000-0000-0000-0000-000000000000', clientHash: 'x1x1' }),
  });
  assert.equal(r.status, 404);
});
