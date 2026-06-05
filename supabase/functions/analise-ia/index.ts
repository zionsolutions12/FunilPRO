// ============================================================
// Edge Function: analise-ia
// Monta um prompt com os dados do funil (resumo-pipeline + relatorio-parados),
// envia para a API da Anthropic pedindo uma análise comercial e retorna
// um JSON ESTRUTURADO (via tool use): leads urgentes, gargalos e previsão
// de faturamento.
// ============================================================
import {
  apiKeyValida,
  errorResponse,
  getSupabase,
  handleOptions,
  jsonResponse,
} from "../_shared/utils.ts";
import { leadsParados, resumoPipeline } from "../_shared/metricas.ts";

const MODELO = "claude-sonnet-4-6";

// Schema da análise estruturada (o modelo é OBRIGADO a preencher via tool use)
const TOOL_ANALISE = {
  name: "registrar_analise_comercial",
  description: "Registra a análise comercial estruturada do funil de vendas.",
  input_schema: {
    type: "object",
    properties: {
      resumo_executivo: {
        type: "string",
        description: "2 a 4 frases sobre a saúde geral do funil de vendas.",
      },
      leads_urgentes: {
        type: "array",
        description: "Leads que precisam de atenção imediata.",
        items: {
          type: "object",
          properties: {
            lead: { type: "string" },
            empresa: { type: "string" },
            motivo: { type: "string", description: "Por que é urgente." },
            acao_recomendada: { type: "string" },
            prioridade: { type: "string", enum: ["alta", "media", "baixa"] },
          },
          required: ["lead", "motivo", "acao_recomendada", "prioridade"],
          additionalProperties: false,
        },
      },
      gargalos: {
        type: "array",
        description: "Pontos de travamento no funil.",
        items: {
          type: "object",
          properties: {
            estagio: { type: "string" },
            descricao: { type: "string" },
            impacto: { type: "string" },
          },
          required: ["estagio", "descricao"],
          additionalProperties: false,
        },
      },
      previsao_faturamento: {
        type: "object",
        description: "Previsão de faturamento com base no pipeline atual.",
        properties: {
          valor_estimado: { type: "number", description: "Faturamento previsto em reais." },
          periodo: { type: "string", description: "Ex: 'próximos 30 dias'." },
          confianca: { type: "string", enum: ["alta", "media", "baixa"] },
          justificativa: { type: "string" },
        },
        required: ["valor_estimado", "periodo", "justificativa"],
        additionalProperties: false,
      },
      recomendacoes: {
        type: "array",
        description: "Ações práticas em ordem de prioridade.",
        items: { type: "string" },
      },
    },
    required: [
      "resumo_executivo",
      "leads_urgentes",
      "gargalos",
      "previsao_faturamento",
      "recomendacoes",
    ],
    additionalProperties: false,
  },
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();
  if (req.method !== "POST") return errorResponse("Método não suportado", 405);
  if (!apiKeyValida(req)) return errorResponse("Não autorizado", 401);

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) return errorResponse("ANTHROPIC_API_KEY não configurada", 500);

  const supabase = getSupabase();

  try {
    // 1) Coleta os dados do funil (mesma lógica de resumo-pipeline e relatorio-parados)
    const [resumo, parados] = await Promise.all([
      resumoPipeline(supabase),
      leadsParados(supabase, 7),
    ]);

    if (resumo.totais.total_leads === 0) {
      return errorResponse("Não há leads para analisar", 400);
    }

    // 2) Monta o prompt com os dados do funil
    const prompt =
`Você é um consultor comercial sênior. Analise os dados do funil de vendas abaixo e registre sua análise chamando a ferramenta "registrar_analise_comercial".

== RESUMO DO PIPELINE ==
${JSON.stringify(resumo, null, 2)}

== LEADS PARADOS (sem atividade há 7+ dias, não fechados) ==
${JSON.stringify(parados.map((l) => ({ nome: l.nome, empresa: l.empresa, estagio: l.estagio, valor: l.valor, temperatura: l.temperatura, dias_parado: l.dias_parado })), null, 2)}

Sua análise deve identificar:
1. Leads que precisam de atenção URGENTE (priorize os "hot"/"enterprise" de alto valor parados ou em negociação/proposta).
2. Os GARGALOS do funil (estágios com acúmulo, baixa conversão ou leads parados).
3. A PREVISÃO DE FATURAMENTO realista para os próximos 30 dias, com base nos leads em proposta/negociação e na taxa de conversão.
Use apenas os dados fornecidos; não invente leads. Responda em português do Brasil.`;

    // 3) Chama a API da Anthropic forçando o uso da tool (saída estruturada)
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: MODELO,
        max_tokens: 2048,
        tools: [TOOL_ANALISE],
        tool_choice: { type: "tool", name: TOOL_ANALISE.name },
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!resp.ok) {
      const detalhe = await resp.text();
      return errorResponse(`Erro na API da Anthropic: ${detalhe}`, 502);
    }

    const data = await resp.json();
    const bloco = (data.content ?? []).find((c: { type: string }) => c.type === "tool_use");
    if (!bloco) return errorResponse("A IA não retornou a análise estruturada", 502);

    // 4) Retorna a análise estruturada
    return jsonResponse({
      analise: bloco.input,
      modelo: MODELO,
      gerado_em: new Date().toISOString(),
    });
  } catch (e) {
    return errorResponse(`Erro interno: ${e.message}`, 500);
  }
});
