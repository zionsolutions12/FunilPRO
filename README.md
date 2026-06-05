# FunilPro — Mini CRM de Funil de Vendas

Mini CRM de funil de vendas com pipeline visual de 5 estágios, métricas automáticas e análise por IA. Projeto educacional ("Do Zero ao Deploy" — Kommo Brasil / GHL Brasil).

> Instruções completas para o Claude Code estão em [`CLAUDE.md`](CLAUDE.md).

## Estrutura

```
FunilPro/
├── src/                    # Frontend (SPA — HTML + JS + Tailwind)
│   ├── index.html
│   ├── styles.css
│   ├── app.js
│   └── config.js           # URL das Edge Functions + API key
├── supabase/
│   ├── migrations/         # Schema SQL (0001) + seed de demo (0002)
│   └── functions/          # 5 Edge Functions (Deno/TS)
├── docs/api.md             # Documentação dos endpoints
├── .env / .env.example     # Credenciais (.env NÃO versionado)
└── CLAUDE.md
```

## Rodar o frontend (modo demo)

Abra `src/index.html` no navegador. Sem backend configurado, ele roda em **modo demo** com 13 leads fictícios — pipeline, drag-and-drop, métricas e análise (heurística local) já funcionam.

## Conectar ao backend (Supabase)

1. **Banco:** rode as migrations em `supabase/migrations/` no SQL Editor do Supabase (ou `supabase db push`).
2. **Edge Functions:** faça deploy (`supabase functions deploy <nome>`) — veja o `CLAUDE.md`.
3. **Secrets das functions:** configure `SUPABASE_URL`, `SUPABASE_SECRET_KEY`, `FUNILPRO_API_KEY` e `ANTHROPIC_API_KEY`.
4. **Frontend:** preencha `src/config.js` com a `FUNCTIONS_URL` e a `API_KEY`. O badge muda de *demo* para *conectado*.

## Banco de dados

Supabase (PostgreSQL). Tabelas `leads` e `atividades` — schema em `supabase/migrations/0001_schema.sql`.
