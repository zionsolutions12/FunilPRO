# FunilPro — Documentação da API

Base URL (Edge Functions):
`https://<SEU-PROJETO>.supabase.co/functions/v1`

Autenticação: header `x-api-key: <FUNILPRO_API_KEY>` em todas as chamadas.

Formato de resposta:
- Sucesso (lista): `{ "dados": [...], "total": N }`
- Sucesso (objeto): `{ "dados": {...} }`
- Erro: `{ "erro": "mensagem", "codigo": 400 }`

---

## Autenticação

### `POST /auth/registrar`
Cria um usuário. Body: `{ "nome", "email", "senha" }` (senha mín. 6 caracteres). Retorna `{ dados: { usuario, token } }`.

### `POST /auth/login`
Autentica. Body: `{ "email", "senha" }`. Retorna `{ dados: { usuario, token } }`.

### `GET /auth/me`
Retorna o usuário logado. Header: `Authorization: Bearer <token>`.

> Senhas são gravadas como hash **PBKDF2**. A sessão usa **JWT HS256** (8h), assinado com `JWT_SECRET`.

---

## Leads

### `GET /leads`
Lista leads ativos (não excluídos).

Query params (opcionais): `estagio`, `valor_minimo`, `responsavel`.

```bash
curl "$BASE/leads?estagio=proposta&valor_minimo=5000" -H "x-api-key: $KEY"
```

### `POST /leads`
Cria um lead. Campo obrigatório: `nome`.

```json
{ "nome": "Fulano", "email": "f@x.com", "valor": 5000, "estagio": "novo", "temperatura": "hot" }
```

### `PUT /leads/:id`
Atualiza campos de um lead.

### `DELETE /leads/:id`
Soft delete (marca `excluido = true`).

---

## `POST /webhook-estagio`
Move um lead de estágio, registra a atividade e **envia um e-mail de notificação** (SMTP Gmail) avisando da alteração no pipeline. Retorna o lead atualizado, a atividade e o status do envio (`email`).

```json
{ "lead_id": "uuid", "estagio_novo": "negociacao", "descricao": "opcional" }
```

---

## `GET /relatorio-parados`
Leads sem atividade nos últimos N dias (não fechados).

Query param: `dias` (default 7). Retorna cada lead com `dias_parado`.

---

## `GET /resumo-pipeline`
Indicadores do funil:
- `por_estagio` — total de leads e valor acumulado por estágio
- `taxa_conversao_geral` — % de leads fechados sobre o total
- `ticket_medio_fechados` — ticket médio dos leads fechados
- `velocidade_funil` — tempo médio (dias) entre estágios, geral e por transição (usa a tabela `atividades`)
- `top_leads_negociacao` — maiores leads (por valor) em negociação

---

## `GET /dashboard-consolidado`
Consolida várias visões num único objeto (reusa a lógica de `resumo-pipeline` e `relatorio-parados`):
- `visao_geral_funil` — o mesmo resumo do `resumo-pipeline`
- `leads_parados` — leads parados (param `dias_parado`, default 7)
- `historico_movimentacao_30dias` — mudanças de estágio dos últimos 30 dias
- `ticket_medio_por_estagio` — valor médio dos leads em cada estágio

---

## `POST /analise-ia`
Análise do pipeline com IA (Claude/Anthropic). Requer `ANTHROPIC_API_KEY` configurada nas Edge Functions. Body pode ser vazio (`{}`).

Retorna `{ dados: { analise, modelo, total_leads, valor_total } }`.

---

## Estágios e temperaturas válidos

- **Estágios:** `novo`, `qualificado`, `proposta`, `negociacao`, `fechado`
- **Temperaturas:** `hot`, `warm`, `cold`, `enterprise`
