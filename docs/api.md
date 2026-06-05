# FunilPro — Documentação da API

Base URL (Edge Functions):
`https://<SEU-PROJETO>.supabase.co/functions/v1`

Autenticação: header `x-api-key: <FUNILPRO_API_KEY>` em todas as chamadas.

Formato de resposta:
- Sucesso (lista): `{ "dados": [...], "total": N }`
- Sucesso (objeto): `{ "dados": {...} }`
- Erro: `{ "erro": "mensagem", "codigo": 400 }`

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
Move um lead de estágio e registra a atividade.

```json
{ "lead_id": "uuid", "estagio_novo": "negociacao", "descricao": "opcional" }
```

---

## `GET /relatorio-parados`
Leads sem atividade nos últimos N dias (não fechados).

Query param: `dias` (default 7). Retorna cada lead com `dias_parado`.

---

## `GET /resumo-pipeline`
Resumo executivo: totais, ticket médio, taxa de conversão, distribuição por estágio e por temperatura.

---

## `POST /analise-ia`
Análise do pipeline com IA (Claude/Anthropic). Requer `ANTHROPIC_API_KEY` configurada nas Edge Functions. Body pode ser vazio (`{}`).

Retorna `{ dados: { analise, modelo, total_leads, valor_total } }`.

---

## Estágios e temperaturas válidos

- **Estágios:** `novo`, `qualificado`, `proposta`, `negociacao`, `fechado`
- **Temperaturas:** `hot`, `warm`, `cold`, `enterprise`
