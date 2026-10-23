# Arquitetura — Wallpaper Platform

Dois produtos integrados sobre um backend comum.

```
┌────────────────────┐        ┌─────────────────────┐
│  Painel Admin Web  │        │   App Desktop (C#)  │
│  Next.js + TS      │        │   .NET / WPF        │
│  (admin publica)   │        │  (usuário descobre, │
│                    │        │   baixa, aplica)    │
└─────────┬──────────┘        └──────────┬──────────┘
          │  HTTPS (auth admin)          │  HTTPS (anon/público)
          ▼                              ▼
     ┌───────────────────────────────────────────┐
     │        Backend / API  (Next.js /api/v1)    │
     │  catálogo · busca · downloads · admin CRUD │
     └───────────────┬───────────────────────────┘
                     ▼
        ┌──────────────────────────────┐
        │        Supabase              │
        │  Postgres · Auth · Storage   │
        │  Realtime (sync web→desktop) │
        └──────────────────────────────┘
```

## Fluxo central (critério de aceitação)

1. Admin faz login no painel → envia arquivo (imagem/vídeo) → preenche metadados → **Publica**.
2. Backend grava o arquivo no Storage e o registro em `wallpapers` com `status='published'`.
3. API passa a retornar o wallpaper em `/api/v1/wallpapers`.
4. App desktop detecta via **Realtime** (ou sincronização periódica por `?since=`) e mostra em **Descobrir**.
5. Usuário clica **Baixar e Aplicar** → download real → aplicação no desktop (imagem via API nativa; vídeo atrás dos ícones via WorkerW).

## Decisões

- **Monorepo** com pacote `shared` de contratos TypeScript — fonte única dos modelos. O app C# espelha esses contratos em DTOs.
- **RLS no banco**: leitura pública só de `published`; escrita só para admins (`is_admin()`), verificada no servidor, nunca só na UI.
- **Storage público de leitura**: URLs diretas para o app baixar; escrita só admin.
- **Dedupe de downloads** na API (janela de 24h por `clientHash`), não em índice único (evita dependência de função não-IMMUTABLE no Postgres).
- **Chaves privilegiadas** (service role) só no backend/servidor. O app desktop e o navegador só recebem a chave `anon`.

## Pastas

| Pasta       | Conteúdo                                             | Status |
|-------------|------------------------------------------------------|--------|
| `database/` | migrations Postgres, RLS, storage, seed              | ✅ pronto e validado |
| `shared/`   | tipos e contratos TS (build + testes)                | ✅ pronto |
| `backend/`  | API `/api/v1` (catálogo, downloads, admin)           | ⏳ Fase 2 |
| `admin/`    | painel Next.js (login, dashboard, upload, gestão)    | ⏳ Fase 3 |
| `desktop/`  | app WPF (.NET) + motor de wallpapers                 | ⏳ Fase 4 |
| `scripts/`  | build, deploy, testes e2e                            | ⏳ |
| `docs/`     | esta documentação                                    | ✅ |

## Referência técnica do motor

O motor de wallpapers (vídeo atrás dos ícones) estuda a abordagem do **Lively Wallpaper**
(open-source, C#/.NET) para a integração WorkerW/Progman — **apenas como referência técnica**,
sem copiar identidade visual. Detecção dinâmica de janelas, recuperação após reinício do
Explorer, troca de resolução e suspensão são tratadas explicitamente (Fase 4b).
