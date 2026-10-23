# Setup — passo a passo

Guia para colocar a base no ar. Nada aqui exige recompilar nada do app depois.
Você vai precisar de **duas contas grátis**: Supabase (banco/storage/auth) e, mais tarde, Vercel (deploy do painel).

## 1. Criar o projeto no Supabase

1. Entre em https://supabase.com → **New project**.
2. Guarde a senha do banco. Escolha a região mais próxima (ex.: São Paulo).
3. Quando o projeto subir, vá em **Project Settings → API** e anote:
   - `Project URL`  → vira `SUPABASE_URL`
   - `anon public`  → vira `SUPABASE_ANON_KEY` (vai no app desktop e no navegador)
   - `service_role` → vira `SUPABASE_SERVICE_ROLE_KEY` (⚠️ **só no backend**, nunca no app/cliente)

## 2. Rodar as migrations

No painel do Supabase, abra **SQL Editor** e rode, nesta ordem, o conteúdo de:

1. `database/migrations/0001_init.sql`
2. `database/migrations/0002_rls_and_storage.sql`
3. `database/seed.sql`  *(opcional — cria as categorias iniciais)*

Isso cria as tabelas, índices, RLS, as triggers (contagem de downloads, `published_at`
automático) e o bucket de storage `wallpapers`. As migrations são idempotentes — rodar de
novo não quebra.

## 3. Criar o primeiro admin

1. Em **Authentication → Users → Add user**, crie seu usuário (email + senha).
2. Copie o `User UID` que aparece.
3. No **SQL Editor**, rode (trocando pelo seu UID):

   ```sql
   insert into admin_profiles (id, role) values ('SEU-USER-UID', 'owner');
   ```

Pronto — esse usuário vira dono e passa no `is_admin()`, podendo publicar.

## 4. Variáveis de ambiente

Copie `.env.example` para `.env` (backend) e preencha com os valores do passo 1.
O app desktop recebe só `SUPABASE_URL` + `SUPABASE_ANON_KEY` + a URL da API.

## Próximas fases (ainda sendo construídas)

- **Fase 2** backend/API: endpoints de catálogo, download e admin.
- **Fase 3** painel: login, dashboard, upload e gestão.
- **Fase 4** app desktop + motor de wallpapers.

Cada fase vem com seu próprio comando de execução e teste documentado aqui.
