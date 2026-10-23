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
