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
