// ============================================================
// Edge Function: analise-ia
// Monta um prompt com os dados do funil (resumo-pipeline + relatorio-parados),
// envia para o OpenRouter (API compatível com OpenAI) pedindo uma análise
// comercial e retorna JSON ESTRUTURADO via function calling:
// leads urgentes, gargalos e previsão de faturamento.
// ============================================================
import {
  apiKeyValida,
  errorResponse,
  getSupabase,
  handleOptions,
  jsonResponse,
} from "../_shared/utils.ts";
import { leadsParados, resumoPipeline } from "../_shared/metricas.ts";

// Modelo no OpenRouter (configurável). Ex: anthropic/claude-opus-4.8
const MODELO_PADRAO = "anthropic/claude-sonnet-4.6";

// JSON Schema da análise (o modelo é OBRIGADO a preencher via function calling)
const SCHEMA_ANALISE = {
  type: "object",
  properties: {
    resumo_executivo: { type: "string", description: "2 a 4 frases sobre a saúde geral do funil." },
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
    },
    recomendacoes: { type: "array", description: "Ações práticas em ordem de prioridade.", items: { type: "string" } },
  },
  required: ["resumo_executivo", "leads_urgentes", "gargalos", "previsao_faturamento", "recomendacoes"],
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();
  if (req.method !== "POST") return errorResponse("Método não suportado", 405);
  if (!apiKeyValida(req)) return errorResponse("Não autorizado", 401);

  const orKey = Deno.env.get("OPENROUTER_API_KEY");
  if (!orKey) return errorResponse("OPENROUTER_API_KEY não configurada", 500);
  const modelo = Deno.env.get("OPENROUTER_MODEL") ?? MODELO_PADRAO;

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
`Você é um consultor comercial sênior. Analise os dados do funil de vendas abaixo e registre sua análise chamando a função "registrar_analise_comercial".

== RESUMO DO PIPELINE ==
${JSON.stringify(resumo, null, 2)}

== LEADS PARADOS (sem atividade há 7+ dias, não fechados) ==
${JSON.stringify(parados.map((l) => ({ nome: l.nome, empresa: l.empresa, estagio: l.estagio, valor: l.valor, temperatura: l.temperatura, dias_parado: l.dias_parado })), null, 2)}

Sua análise deve identificar:
1. Leads que precisam de atenção URGENTE (priorize os "hot"/"enterprise" de alto valor parados ou em negociação/proposta).
2. Os GARGALOS do funil (estágios com acúmulo, baixa conversão ou leads parados).
3. A PREVISÃO DE FATURAMENTO realista para os próximos 30 dias, com base nos leads em proposta/negociação e na taxa de conversão.
Use apenas os dados fornecidos; não invente leads. Responda em português do Brasil.`;

    // 3) Chama o OpenRouter forçando a função (saída estruturada)
    const resp = await fetch("https://openrouter.ai/api/v1/chat/completions", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "authorization": `Bearer ${orKey}`,
        "X-Title": "FunilPro",
      },
      body: JSON.stringify({
        model: modelo,
        max_tokens: 4096,
        messages: [{ role: "user", content: prompt }],
        tools: [{
          type: "function",
          function: {
            name: "registrar_analise_comercial",
            description: "Registra a análise comercial estruturada do funil de vendas.",
            parameters: SCHEMA_ANALISE,
          },
        }],
        tool_choice: { type: "function", function: { name: "registrar_analise_comercial" } },
      }),
    });

    if (!resp.ok) {
      const detalhe = await resp.text();
      return errorResponse(`Erro no OpenRouter: ${detalhe}`, 502);
    }

    const data = await resp.json();
    const escolha = data?.choices?.[0];
    const call = escolha?.message?.tool_calls?.[0];
    if (!call?.function?.arguments) {
      return errorResponse(
        `A IA não retornou a análise estruturada (finish=${escolha?.finish_reason}; content=${String(escolha?.message?.content ?? "").slice(0, 200)})`,
        502,
      );
    }

    let analise: unknown;
    try {
      analise = JSON.parse(call.function.arguments);
    } catch {
      return errorResponse(
        `Resposta da IA não é um JSON válido (finish=${escolha?.finish_reason}; args=${String(call.function.arguments).slice(0, 300)})`,
        502,
      );
    }

    // 4) Retorna a análise estruturada
    return jsonResponse({ analise, modelo, gerado_em: new Date().toISOString() });
  } catch (e) {
    return errorResponse(`Erro interno: ${e.message}`, 500);
  }
});
