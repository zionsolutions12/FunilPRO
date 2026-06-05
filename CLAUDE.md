# FunilPro — Mini CRM de Funil de Vendas

## Contexto do Projeto

FunilPro é um mini CRM de funil de vendas construído do zero usando Claude Code.
O projeto serve como base educacional para o módulo "Do Zero ao Deploy" das comunidades Kommo Brasil e GHL Brasil.

**Problema que resolve:** Gestão visual de leads em um pipeline de vendas com 5 estágios, métricas automáticas e análise por IA.

**Público-alvo:** Empreendedores, gestores comerciais e profissionais de vendas que querem entender como construir ferramentas com IA — mesmo sem ser programador.

## Stack Técnico

- **Frontend:** HTML + JavaScript + Tailwind CSS (single-page app)
- **Backend:** Supabase Edge Functions (Deno/TypeScript)
- **Banco de dados:** Supabase (PostgreSQL)
- **IA:** API da Anthropic (Claude) para análise do pipeline
- **Versionamento:** Git + GitHub
- **Deploy:** Vercel (frontend) + Supabase (Edge Functions)
- **MCP Servers:** Supabase MCP para acesso direto ao banco via Claude Code

## Estrutura do Projeto

```
funilpro/
├── CLAUDE.md              # Este arquivo — instruções pro Claude Code
├── .env                   # Credenciais (NUNCA commitar)
├── .env.example           # Template de credenciais (sem valores reais)
├── .gitignore             # Arquivos ignorados pelo Git
├── README.md              # Documentação do projeto
├── src/
│   ├── index.html         # Dashboard principal (pipeline visual)
│   ├── styles.css         # Estilos customizados (complemento ao Tailwind)
│   └── app.js             # Lógica do frontend (fetch API, drag-and-drop, métricas)
├── supabase/
│   └── functions/
│       ├── leads/
│       │   └── index.ts   # CRUD de leads (GET, POST, PUT, DELETE)
│       ├── webhook-estagio/
│       │   └── index.ts   # Webhook de mudança de estágio
│       ├── relatorio-parados/
│       │   └── index.ts   # Relatório de leads sem atividade
│       ├── resumo-pipeline/
│       │   └── index.ts   # Resumo executivo do funil
│       └── analise-ia/
│           └── index.ts   # Análise do pipeline com IA (Anthropic)
└── docs/
    └── api.md             # Documentação dos endpoints
```

## Banco de Dados — Schema Supabase

### Tabela: leads

| Coluna        | Tipo         | Descrição                                         |
|---------------|--------------|---------------------------------------------------|
| id            | uuid (PK)    | Identificador único, gerado automaticamente       |
| nome          | text         | Nome do contato (obrigatório)                     |
| email         | text         | Email do contato                                  |
| telefone      | text         | Telefone com DDD                                  |
| empresa       | text         | Nome da empresa do lead                           |
| valor         | numeric      | Valor estimado do negócio em R$                   |
| estagio       | text         | Estágio no funil (ver valores abaixo)             |
| temperatura   | text         | hot, warm, cold ou enterprise                     |
| responsavel   | text         | Nome do vendedor responsável                      |
| criado_em     | timestamptz  | Data de criação (default: now())                  |
| atualizado_em | timestamptz  | Última atualização (default: now())               |
| excluido      | boolean      | Soft delete (default: false)                      |

**Estágios válidos:** `novo`, `qualificado`, `proposta`, `negociacao`, `fechado`

**Temperaturas válidas:** `hot`, `warm`, `cold`, `enterprise`

### Tabela: atividades

| Coluna         | Tipo         | Descrição                                        |
|----------------|--------------|--------------------------------------------------|
| id             | uuid (PK)    | Identificador único                              |
| lead_id        | uuid (FK)    | Referência ao lead                               |
| tipo           | text         | Tipo: mudanca_estagio, nota, contato, tarefa     |
| descricao      | text         | Descrição da atividade                           |
| estagio_anterior | text       | Estágio antes da mudança (se aplicável)          |
| estagio_novo   | text         | Estágio depois da mudança (se aplicável)         |
| criado_em      | timestamptz  | Data da atividade (default: now())               |

## Variáveis de Ambiente (.env)

> Este projeto usa o **novo formato de chaves do Supabase**: `sb_publishable_…` (substitui a antiga `anon key`, segura para o frontend) e `sb_secret_…` (substitui a `service_role key`, exclusiva de backend).

```
SUPABASE_URL=https://xxxxx.supabase.co
SUPABASE_PUBLISHABLE_KEY=sb_publishable_xxxxx
SUPABASE_SECRET_KEY=sb_secret_xxxxx
ANTHROPIC_API_KEY=sk-ant-...
FUNILPRO_API_KEY=fp_live_xxxxx
```

## Regras de Segurança — OBRIGATÓRIAS

1. **NUNCA** incluir credenciais no código. Sempre usar variáveis de ambiente via `.env`
2. **NUNCA** commitar o arquivo `.env` no Git. Verificar `.gitignore` antes de qualquer commit
3. **SEMPRE** validar inputs nas Edge Functions (campos obrigatórios, tipos, tamanhos)
4. **SEMPRE** usar a `FUNILPRO_API_KEY` no header `x-api-key` para autenticar chamadas à API
5. **SEMPRE** usar soft delete (marcar `excluido = true`) ao invés de apagar registros
6. **SEMPRE** registrar atividade na tabela `atividades` quando houver mudança de estágio
7. **NUNCA** expor a `SUPABASE_SECRET_KEY` no frontend — usar apenas a `SUPABASE_PUBLISHABLE_KEY`

## Convenções de Código

- **Linguagem:** TypeScript para Edge Functions, JavaScript para frontend
- **Nomenclatura:** snake_case para colunas do banco, camelCase para variáveis JS/TS
- **Comentários:** Em português
- **Tratamento de erro:** Sempre retornar JSON com `{ erro: "mensagem", codigo: 400 }`
- **Respostas da API:** Sempre retornar JSON com `{ dados: [...], total: N }`
- **Datas:** Sempre em ISO 8601 (timestamptz)

## Endpoints da API

| Método | Endpoint              | Descrição                              |
|--------|-----------------------|----------------------------------------|
| GET    | /leads                | Listar leads (filtros: estagio, valor_minimo, responsavel) |
| POST   | /leads                | Criar novo lead                        |
| PUT    | /leads/:id            | Atualizar lead                         |
| DELETE | /leads/:id            | Soft delete do lead                    |
| POST   | /webhook-estagio      | Registrar mudança de estágio           |
| GET    | /relatorio-parados    | Leads sem atividade (param: dias=7)    |
| GET    | /resumo-pipeline      | Resumo executivo do funil              |
| POST   | /analise-ia           | Análise do pipeline com IA             |

## Dados Fictícios para Demo

O projeto usa 13 leads fictícios com nomes brasileiros realistas, distribuídos nos 5 estágios do funil, com valores entre R$3.200 e R$15.000, e temperaturas variadas. Os dados devem parecer reais para demonstrações em vídeo.

## Instruções de Deploy

### Edge Functions (Supabase)
```bash
supabase functions deploy leads
supabase functions deploy webhook-estagio
supabase functions deploy relatorio-parados
supabase functions deploy resumo-pipeline
supabase functions deploy analise-ia
```

### Frontend (Vercel)
1. Conectar repositório GitHub na Vercel
2. Configurar variáveis de ambiente: SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, FUNILPRO_API_KEY
3. Deploy automático a cada push na branch main
