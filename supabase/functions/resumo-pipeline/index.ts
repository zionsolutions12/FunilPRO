// ============================================================
// Edge Function: resumo-pipeline
// Resumo executivo do funil: contagem e valor por estágio + totais.
// ============================================================
import {
  apiKeyValida,
  errorResponse,
  getSupabase,
  handleOptions,
  jsonResponse,
} from "../_shared/utils.ts";

const ESTAGIOS = ["novo", "qualificado", "proposta", "negociacao", "fechado"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();
  if (req.method !== "GET") return errorResponse("Método não suportado", 405);
  if (!apiKeyValida(req)) return errorResponse("Não autorizado", 401);

  const supabase = getSupabase();

  try {
    const { data: leads, error } = await supabase
      .from("leads")
      .select("estagio, valor, temperatura")
      .eq("excluido", false);
    if (error) return errorResponse(error.message, 500);

    const lista = leads ?? [];

    // Inicializa o resumo por estágio
    const porEstagio = ESTAGIOS.map((estagio) => {
      const doEstagio = lista.filter((l) => l.estagio === estagio);
      const valor = doEstagio.reduce((s, l) => s + Number(l.valor ?? 0), 0);
      return { estagio, quantidade: doEstagio.length, valor };
    });

    const totalLeads = lista.length;
    const valorTotal = lista.reduce((s, l) => s + Number(l.valor ?? 0), 0);
    const fechados = lista.filter((l) => l.estagio === "fechado").length;
    const taxaConversao = totalLeads > 0
      ? Number(((fechados / totalLeads) * 100).toFixed(1))
      : 0;
    const ticketMedio = totalLeads > 0
      ? Number((valorTotal / totalLeads).toFixed(2))
      : 0;

    // Distribuição por temperatura
    const porTemperatura = ["hot", "warm", "cold", "enterprise"].map((t) => ({
      temperatura: t,
      quantidade: lista.filter((l) => l.temperatura === t).length,
    }));

    return jsonResponse({
      total_leads: totalLeads,
      valor_total: valorTotal,
      ticket_medio: ticketMedio,
      leads_fechados: fechados,
      taxa_conversao: taxaConversao,
      por_estagio: porEstagio,
      por_temperatura: porTemperatura,
    });
  } catch (e) {
    return errorResponse(`Erro interno: ${e.message}`, 500);
  }
});
