# Painel Admin — MeuWallpaper (Next.js)

Painel web que gerencia o catálogo e as licenças, e serve a API pública que o app desktop consome.
Fala direto com o Supabase (sem backend separado).

## Variáveis de ambiente

| Variável | Onde achar no Supabase |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Settings → API → Project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Settings → API → anon public |
| `SUPABASE_SERVICE_ROLE_KEY` | Settings → API → service_role (secreta) |

## Deploy na Vercel (recomendado)

1. vercel.com → **Add New → Project** → importe o repositório `wallpaper` do GitHub
2. Em **Root Directory**, selecione **`admin`**
3. Framework: Next.js (detecta sozinho)
4. Em **Environment Variables**, cole as 3 variáveis acima
5. **Deploy** — sai uma URL tipo `https://seu-painel.vercel.app`

Depois do deploy, aponte o app desktop para essa URL (no `appsettings.json` do desktop,
`api.baseUrl`, ou a variável `WP_API_BASE_URL`).

## Rodar local (quando tiver Node)

```bash
cd admin
cp .env.example .env.local   # preencha as 3 variáveis
npm install
npm run dev                  # http://localhost:3000
```

## O que o painel faz

- **Login** (Supabase Auth) — só entra quem está em `admin_profiles` como admin/owner.
- **Dashboard** — totais, publicados/rascunhos, downloads, mais baixados e uploads recentes.
- **Adicionar** — upload real do arquivo pro Storage + metadados; salva rascunho ou publica.
- **Wallpapers** — lista tudo, publica/despublica, exclui.
- **Categorias** — cria e remove.
- **Licenças** — gera lote de chaves, define ativações por chave, revoga/exclui.

## API pública (consumida pelo app desktop)

- `GET /api/v1/wallpapers` — catálogo publicado (filtros: category, type, search, sort, minWidth, page)
- `GET /api/v1/wallpapers/:id`
- `GET /api/v1/categories`
- `POST /api/v1/downloads` — registra download (dedupe 24h via RPC)
- `POST /api/v1/activate` — ativa licença (via RPC, vínculo por device)
