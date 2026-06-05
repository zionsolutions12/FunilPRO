// ============================================================
// Edge Function: relatorio-parados
// Lista leads sem nenhuma atividade nos últimos N dias (param: dias=7).
// Ignora leads já fechados.
// ============================================================
import {
  apiKeyValida,
  errorResponse,
  getSupabase,
  handleOptions,
  jsonResponse,
} from "../_shared/utils.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();
  if (req.method !== "GET") return errorResponse("Método não suportado", 405);
  if (!apiKeyValida(req)) return errorResponse("Não autorizado", 401);

  const supabase = getSupabase();
  const url = new URL(req.url);
  const dias = Number(url.searchParams.get("dias") ?? "7");
  if (Number.isNaN(dias) || dias < 0) {
    return errorResponse("Parâmetro 'dias' inválido", 400);
  }

  try {
    const limite = new Date();
    limite.setDate(limite.getDate() - dias);
    const limiteIso = limite.toISOString();

    // Todos os leads ativos e ainda não fechados
    const { data: leads, error: erroLeads } = await supabase
      .from("leads")
      .select("*")
      .eq("excluido", false)
      .neq("estagio", "fechado");
    if (erroLeads) return errorResponse(erroLeads.message, 500);

    // Atividades recentes (dentro da janela)
    const { data: ativsRecentes, error: erroAtiv } = await supabase
      .from("atividades")
      .select("lead_id")
      .gte("criado_em", limiteIso);
    if (erroAtiv) return errorResponse(erroAtiv.message, 500);

    const comAtividade = new Set((ativsRecentes ?? []).map((a) => a.lead_id));

    // Parado = sem atividade recente E criado antes da janela
    const parados = (leads ?? [])
      .filter((l) => !comAtividade.has(l.id) && l.criado_em < limiteIso)
      .map((l) => {
        const diasParado = Math.floor(
          (Date.now() - new Date(l.atualizado_em).getTime()) / 86_400_000,
        );
        return { ...l, dias_parado: diasParado };
      })
      .sort((a, b) => b.dias_parado - a.dias_parado);

    return jsonResponse(parados);
  } catch (e) {
    return errorResponse(`Erro interno: ${e.message}`, 500);
  }
});
