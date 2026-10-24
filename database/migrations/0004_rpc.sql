-- =====================================================================
-- Migration 0004: funções RPC (SECURITY DEFINER) chamadas pelo app desktop
-- com a chave anon, sem expor escrita direta nas tabelas.
--  * activate_license: valida e ativa uma chave (vínculo por device).
--  * register_download: conta download com dedupe por cliente (janela).
-- Rode depois do 0003.
-- =====================================================================

-- ---------- Ativação de licença ----------
create or replace function activate_license(
  p_key text, p_device text, p_device_name text default null
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  k license_keys%rowtype;
  v_exists boolean;
begin
  select * into k from license_keys where key = upper(trim(p_key)) for update;
  if not found then return jsonb_build_object('ok', false, 'reason', 'invalid'); end if;
  if k.status = 'revoked' then return jsonb_build_object('ok', false, 'reason', 'revoked'); end if;
  if k.expires_at is not null and k.expires_at < now() then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;

  select exists(select 1 from key_activations where key_id = k.id and device_hash = p_device) into v_exists;
  if v_exists then
    update license_keys set last_used_at = now() where id = k.id;
    return jsonb_build_object('ok', true, 'alreadyActivated', true, 'expiresAt', k.expires_at);
  end if;

  if k.activation_count >= k.max_activations then
    return jsonb_build_object('ok', false, 'reason', 'limit');
  end if;

  insert into key_activations (key_id, device_hash, device_name)
    values (k.id, p_device, p_device_name);
  return jsonb_build_object('ok', true, 'alreadyActivated', false, 'expiresAt', k.expires_at);
end; $$;

-- qualquer cliente (anon) pode tentar ativar
grant execute on function activate_license(text, text, text) to anon, authenticated;

-- ---------- Registro de download (com dedupe) ----------
create or replace function register_download(
  p_wallpaper uuid, p_client text default null, p_window_hours int default 24
) returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count bigint;
  v_counted boolean := false;
  v_published boolean;
begin
  select (status = 'published') into v_published from wallpapers where id = p_wallpaper;
  if v_published is null or v_published = false then
    return jsonb_build_object('ok', false, 'counted', false, 'downloadCount', 0);
  end if;

  if p_client is not null then
    insert into download_events (wallpaper_id, client_hash)
    select p_wallpaper, p_client
    where not exists (
      select 1 from download_events
      where wallpaper_id = p_wallpaper and client_hash = p_client
        and created_at > now() - (p_window_hours || ' hours')::interval
    );
    v_counted := found;
  else
    insert into download_events (wallpaper_id) values (p_wallpaper);
    v_counted := true;
  end if;

  select download_count into v_count from wallpapers where id = p_wallpaper;
  return jsonb_build_object('ok', true, 'counted', v_counted, 'downloadCount', v_count);
end; $$;

grant execute on function register_download(uuid, text, int) to anon, authenticated;
