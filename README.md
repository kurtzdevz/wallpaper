# Wallpaper Platform

Dois produtos integrados:

- **App desktop Windows** (.NET/WPF) — descobrir, baixar e aplicar wallpapers (imagem e vídeo animado atrás dos ícones).
- **Painel admin web** (Next.js) — publicar e gerenciar o catálogo. O que você publica aparece automaticamente no app.

Backend comum em **Supabase** (Postgres + Auth + Storage + Realtime).

> **Critério de aceitação:** publicar um wallpaper no painel → ele aparece na aba **Descobrir** do app → **Baixar e Aplicar** → funcionando na área de trabalho, sem passos manuais.

## Status por fase

- [x] **Fase 1 — Fundação:** estrutura, schema do banco (validado em Postgres real), RLS, storage, contratos TS (build + testes).
- [ ] **Fase 2 — Backend/API** (`/api/v1`).
- [ ] **Fase 3 — Painel admin.**
- [ ] **Fase 4 — App desktop + motor de wallpapers.**
- [ ] **Fase 5 — Integração e testes e2e.**
- [ ] **Fase 6 — Build, instalador, entrega.**

## Estrutura

```
database/   migrations SQL + RLS + storage + seed   (pronto)
shared/     tipos/contratos TS                       (pronto)
backend/    API                                       (fase 2)
admin/      painel Next.js                            (fase 3)
desktop/    app WPF .NET + motor                      (fase 4)
scripts/    build/deploy/testes                       (—)
docs/       arquitetura e setup                       (pronto)
```

## Começar

Veja **`docs/setup.md`** (criar projeto Supabase, rodar migrations, primeiro admin, variáveis de ambiente) e **`docs/architecture.md`** (visão geral e decisões).

Validar a fundação localmente:

```bash
npm install
npm run build:shared
npm run test:shared
```
