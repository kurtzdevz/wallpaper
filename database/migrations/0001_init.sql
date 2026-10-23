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
