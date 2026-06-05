// ============================================================
// Edge Function: analise-ia
// Analisa o pipeline atual com IA (Claude / Anthropic) e devolve
// um diagnóstico em linguagem natural com recomendações.
// ============================================================
import {
  apiKeyValida,
  errorResponse,
  getSupabase,
  handleOptions,
  jsonResponse,
} from "../_shared/utils.ts";

const ESTAGIOS = ["novo", "qualificado", "proposta", "negociacao", "fechado"];
const ANTHROPIC_MODEL = "claude-sonnet-4-6";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();
  if (req.method !== "POST") return errorResponse("Método não suportado", 405);
  if (!apiKeyValida(req)) return errorResponse("Não autorizado", 401);

  const anthropicKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!anthropicKey) {
    return errorResponse("ANTHROPIC_API_KEY não configurada", 500);
  }

  const supabase = getSupabase();

  try {
    // Coleta os dados do pipeline
    const { data: leads, error } = await supabase
      .from("leads")
      .select("nome, empresa, valor, estagio, temperatura, responsavel")
      .eq("excluido", false);
    if (error) return errorResponse(error.message, 500);

    const lista = leads ?? [];
    if (lista.length === 0) {
      return errorResponse("Não há leads para analisar", 400);
    }

    const resumo = ESTAGIOS.map((estagio) => {
      const doEstagio = lista.filter((l) => l.estagio === estagio);
      const valor = doEstagio.reduce((s, l) => s + Number(l.valor ?? 0), 0);
      return `${estagio}: ${doEstagio.length} leads, R$ ${valor.toLocaleString("pt-BR")}`;
    }).join("\n");

    const valorTotal = lista.reduce((s, l) => s + Number(l.valor ?? 0), 0);

    const prompt =
`Você é um consultor de vendas. Analise o funil de vendas abaixo e responda em português do Brasil.

Total de leads: ${lista.length}
Valor total em pipeline: R$ ${valorTotal.toLocaleString("pt-BR")}

Distribuição por estágio:
${resumo}

Detalhe dos leads (JSON):
${JSON.stringify(lista, null, 2)}

Entregue uma análise objetiva com:
1. Diagnóstico geral da saúde do funil (2-3 frases).
2. Gargalos ou riscos identificados.
3. Três ações práticas recomendadas, em ordem de prioridade.
Use linguagem direta e acionável. Não invente dados além dos fornecidos.`;

    // Chama a API da Anthropic
    const resp = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-api-key": anthropicKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: ANTHROPIC_MODEL,
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!resp.ok) {
      const detalhe = await resp.text();
      return errorResponse(`Erro na API da Anthropic: ${detalhe}`, 502);
    }

    const data = await resp.json();
    const analise = data?.content?.[0]?.text ?? "Sem resposta da IA.";

    return jsonResponse({
      analise,
      modelo: ANTHROPIC_MODEL,
      total_leads: lista.length,
      valor_total: valorTotal,
    });
  } catch (e) {
    return errorResponse(`Erro interno: ${e.message}`, 500);
  }
});
