-- ============================================================
-- MeuWallpaper — setup completo do banco (cole TUDO no SQL Editor do Supabase)
-- Cria tabelas, segurança (RLS), storage, sistema de licença e categorias.
-- Pode rodar mais de uma vez sem quebrar.
-- ============================================================

-- =====================================================================
-- Wallpaper Platform — schema inicial (PostgreSQL / Supabase)
-- Migration 0001: tabelas de domínio, índices, constraints, relações.
-- Idempotente onde possível. Rode no SQL Editor do Supabase ou via psql.
-- =====================================================================

create extension if not exists "pgcrypto";   -- gen_random_uuid()

-- ---------- ENUMS ----------
do $$ begin
  create type wallpaper_type as enum ('image', 'video');
exception when duplicate_object then null; end $$;

do $$ begin
  create type wallpaper_status as enum ('draft', 'published');
exception when duplicate_object then null; end $$;

-- ---------- CATEGORIES ----------
create table if not exists categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  slug        text not null unique,
  image_path  text,
  icon        text,
  sort_order  int  not null default 0,
  enabled     boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists idx_categories_enabled_sort on categories (enabled, sort_order);

-- ---------- TAGS ----------
create table if not exists tags (
  id    uuid primary key default gen_random_uuid(),
  name  text not null,
  slug  text not null unique
);

-- ---------- WALLPAPERS ----------
create table if not exists wallpapers (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  description        text,
  category_id        uuid references categories (id) on delete set null,
  type               wallpaper_type   not null,
  status             wallpaper_status not null default 'draft',
  featured           boolean not null default false,

  file_path          text not null,          -- caminho no storage (bucket/key)
  thumbnail_path     text,                   -- capa/preview no storage
  resolution_width   int,
  resolution_height  int,
  file_size          bigint,                 -- bytes
  duration           numeric(10,3),          -- segundos (apenas vídeo)
  checksum           text,                   -- sha256 do arquivo principal

  download_count     bigint not null default 0,

  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now(),
  published_at       timestamptz,

  constraint chk_resolution_positive
    check ((resolution_width is null or resolution_width  > 0)
       and (resolution_height is null or resolution_height > 0)),
  constraint chk_duration_video
    check (type = 'video' or duration is null)
);

create index if not exists idx_wallpapers_status_published
  on wallpapers (status, published_at desc);
create index if not exists idx_wallpapers_category   on wallpapers (category_id);
create index if not exists idx_wallpapers_featured   on wallpapers (featured) where featured;
create index if not exists idx_wallpapers_type       on wallpapers (type);
create index if not exists idx_wallpapers_downloads  on wallpapers (download_count desc);
-- busca textual simples por título/descrição
create index if not exists idx_wallpapers_title_trgm on wallpapers using gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(description,'')));

-- ---------- WALLPAPER_TAGS (N:N) ----------
create table if not exists wallpaper_tags (
  wallpaper_id uuid not null references wallpapers (id) on delete cascade,
  tag_id       uuid not null references tags (id)       on delete cascade,
  primary key (wallpaper_id, tag_id)
);
create index if not exists idx_wallpaper_tags_tag on wallpaper_tags (tag_id);

-- ---------- DOWNLOAD_EVENTS ----------
-- Um registro por download. download_count em wallpapers é o agregado (mantido por trigger).
create table if not exists download_events (
  id           bigint generated always as identity primary key,
  wallpaper_id uuid not null references wallpapers (id) on delete cascade,
  client_hash  text,                       -- hash anônimo do cliente p/ dedupe/anti-abuso
  created_at   timestamptz not null default now()
);
create index if not exists idx_download_events_wp   on download_events (wallpaper_id);
create index if not exists idx_download_events_time on download_events (created_at desc);
-- índice de apoio ao dedupe feito na API (checa evento recente por wallpaper+cliente)
create index if not exists idx_download_events_dedupe
  on download_events (wallpaper_id, client_hash, created_at desc)
  where client_hash is not null;
-- Dedupe/anti-abuso (ex.: 1 download contável por cliente a cada 24h) é aplicado
-- na API em /downloads (INSERT condicional por NOT EXISTS na janela de tempo).

-- ---------- ADMIN_PROFILES ----------
-- Em Supabase, id referencia auth.users(id). role controla autorização no servidor.
create table if not exists admin_profiles (
  id         uuid primary key,             -- = auth.users.id
  role       text not null default 'viewer' check (role in ('owner','admin','viewer')),
  created_at timestamptz not null default now()
);

-- ---------- TRIGGERS: updated_at ----------
create or replace function set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end; $$ language plpgsql;

drop trigger if exists trg_categories_updated on categories;
create trigger trg_categories_updated before update on categories
  for each row execute function set_updated_at();

drop trigger if exists trg_wallpapers_updated on wallpapers;
create trigger trg_wallpapers_updated before update on wallpapers
  for each row execute function set_updated_at();

-- ---------- TRIGGER: published_at automático ----------
create or replace function set_published_at() returns trigger as $$
begin
  if new.status = 'published' and (old.status is distinct from 'published') then
    new.published_at = coalesce(new.published_at, now());
  end if;
  if new.status = 'draft' then
    new.published_at = null;
  end if;
  return new;
end; $$ language plpgsql;

drop trigger if exists trg_wallpapers_publish on wallpapers;
create trigger trg_wallpapers_publish before insert or update on wallpapers
  for each row execute function set_published_at();

-- ---------- TRIGGER: agregação de download_count ----------
create or replace function bump_download_count() returns trigger as $$
begin
  update wallpapers set download_count = download_count + 1 where id = new.wallpaper_id;
  return new;
end; $$ language plpgsql;

drop trigger if exists trg_download_count on download_events;
create trigger trg_download_count after insert on download_events
  for each row execute function bump_download_count();


-- =====================================================================
-- Migration 0002: Row Level Security + bucket de storage.
-- Modelo de distribuição:
--   * Catálogo PÚBLICO de leitura só para wallpapers 'published' (via API/anon).
--   * Escrita (insert/update/delete) só para admins autenticados (role admin/owner).
--   * download_events: insert público (registro de download), sem leitura pública.
-- Rode DEPOIS do 0001.
-- =====================================================================

alter table categories      enable row level security;
alter table tags            enable row level security;
alter table wallpapers      enable row level security;
alter table wallpaper_tags  enable row level security;
alter table download_events enable row level security;
alter table admin_profiles  enable row level security;

-- Helper: o usuário autenticado é admin/owner?
create or replace function is_admin() returns boolean as $$
  select exists (
    select 1 from admin_profiles p
    where p.id = auth.uid() and p.role in ('admin','owner')
  );
$$ language sql stable security definer;

-- ---------- CATEGORIES ----------
drop policy if exists cat_read_public on categories;
create policy cat_read_public on categories
  for select using (enabled = true or is_admin());

drop policy if exists cat_write_admin on categories;
create policy cat_write_admin on categories
  for all using (is_admin()) with check (is_admin());

-- ---------- TAGS ----------
drop policy if exists tags_read_public on tags;
create policy tags_read_public on tags for select using (true);

drop policy if exists tags_write_admin on tags;
create policy tags_write_admin on tags
  for all using (is_admin()) with check (is_admin());

-- ---------- WALLPAPERS ----------
drop policy if exists wp_read_published on wallpapers;
create policy wp_read_published on wallpapers
  for select using (status = 'published' or is_admin());

drop policy if exists wp_write_admin on wallpapers;
create policy wp_write_admin on wallpapers
  for all using (is_admin()) with check (is_admin());

-- ---------- WALLPAPER_TAGS ----------
drop policy if exists wptags_read_public on wallpaper_tags;
create policy wptags_read_public on wallpaper_tags for select using (true);

drop policy if exists wptags_write_admin on wallpaper_tags;
create policy wptags_write_admin on wallpaper_tags
  for all using (is_admin()) with check (is_admin());

-- ---------- DOWNLOAD_EVENTS ----------
-- qualquer cliente pode registrar um download; ninguém lê publicamente (só admin).
drop policy if exists dl_insert_public on download_events;
create policy dl_insert_public on download_events
  for insert with check (true);

drop policy if exists dl_read_admin on download_events;
create policy dl_read_admin on download_events
  for select using (is_admin());

-- ---------- ADMIN_PROFILES ----------
drop policy if exists adm_self_read on admin_profiles;
create policy adm_self_read on admin_profiles
  for select using (id = auth.uid() or is_admin());

drop policy if exists adm_admin_write on admin_profiles;
create policy adm_admin_write on admin_profiles
  for all using (is_admin()) with check (is_admin());

-- =====================================================================
-- STORAGE (Supabase). Rode no projeto Supabase; cria o bucket de mídia.
-- Bucket público de leitura (URLs diretas p/ o app baixar), escrita só admin.
-- =====================================================================
insert into storage.buckets (id, name, public)
values ('wallpapers', 'wallpapers', true)
on conflict (id) do nothing;

drop policy if exists storage_read_public on storage.objects;
create policy storage_read_public on storage.objects
  for select using (bucket_id = 'wallpapers');

drop policy if exists storage_write_admin on storage.objects;
create policy storage_write_admin on storage.objects
  for all using (bucket_id = 'wallpapers' and is_admin())
  with check (bucket_id = 'wallpapers' and is_admin());


-- =====================================================================
-- Migration 0003: sistema de licença (chaves) para o app desktop.
-- O admin gera chaves no painel; o app ativa com a chave (vínculo por device).
-- RLS: acesso só admin (o backend opera com conexão de serviço).
-- Rode depois do 0002.
-- =====================================================================

do $$ begin
  create type license_status as enum ('active', 'revoked');
exception when duplicate_object then null; end $$;

create table if not exists license_keys (
  id               uuid primary key default gen_random_uuid(),
  key              text not null unique,         -- formato MW-XXXX-XXXX-XXXX
  label            text,                         -- nota do admin (comprador, lote...)
  status           license_status not null default 'active',
  max_activations  int not null default 1 check (max_activations >= 1),
  activation_count int not null default 0,
  expires_at       timestamptz,                  -- null = sem expiração
  created_at       timestamptz not null default now(),
  last_used_at     timestamptz
);
create index if not exists idx_license_keys_status on license_keys (status);
create index if not exists idx_license_keys_created on license_keys (created_at desc);

create table if not exists key_activations (
  id          bigint generated always as identity primary key,
  key_id      uuid not null references license_keys (id) on delete cascade,
  device_hash text not null,                     -- hash anônimo e estável da máquina
  device_name text,
  created_at  timestamptz not null default now(),
  unique (key_id, device_hash)                   -- 1 ativação por device por chave
);
create index if not exists idx_key_activations_key on key_activations (key_id);

-- mantém activation_count agregado em license_keys
create or replace function sync_activation_count() returns trigger as $$
begin
  if tg_op = 'INSERT' then
    update license_keys set activation_count = activation_count + 1, last_used_at = now()
      where id = new.key_id;
  elsif tg_op = 'DELETE' then
    update license_keys set activation_count = greatest(activation_count - 1, 0)
      where id = old.key_id;
  end if;
  return null;
end; $$ language plpgsql;

drop trigger if exists trg_activation_count on key_activations;
create trigger trg_activation_count after insert or delete on key_activations
  for each row execute function sync_activation_count();

-- ---------- RLS (somente admin; backend usa conexão de serviço) ----------
alter table license_keys     enable row level security;
alter table key_activations  enable row level security;

drop policy if exists keys_admin on license_keys;
create policy keys_admin on license_keys for all using (is_admin()) with check (is_admin());

drop policy if exists acts_admin on key_activations;
create policy acts_admin on key_activations for all using (is_admin()) with check (is_admin());


-- Seed opcional: categorias iniciais. Rode depois das migrations.
insert into categories (name, slug, sort_order, icon) values
  ('Anime',        'anime',        10, 'sparkles'),
  ('Games',        'games',        20, 'gamepad'),
  ('Carros',       'carros',       30, 'car'),
  ('Natureza',     'natureza',     40, 'leaf'),
  ('Filmes e Séries','filmes-series',50,'film'),
  ('Minimalistas', 'minimalistas', 60, 'minus'),
  ('Abstratos',    'abstratos',    70, 'shapes'),
  ('4K',           '4k',           80, 'monitor'),
  ('Ultrawide',    'ultrawide',    90, 'monitor-dot')
on conflict (slug) do nothing;
