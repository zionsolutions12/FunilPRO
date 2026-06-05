// ============================================================
// Edge Function: dashboard-consolidado
// Consolida num único objeto:
//   1. visao_geral_funil           -> resumoPipeline()  (resumo-pipeline)
//   2. leads_parados               -> leadsParados()     (relatorio-parados)
//   3. historico_movimentacao_30dias -> atividades dos últimos 30 dias
//   4. ticket_medio_por_estagio    -> valor médio dos leads por estágio
// ============================================================
import {
  apiKeyValida,
  errorResponse,
  getSupabase,
  handleOptions,
  jsonResponse,
} from "../_shared/utils.ts";
import { ESTAGIOS, leadsParados, r2, resumoPipeline } from "../_shared/metricas.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();
  if (req.method !== "GET") return errorResponse("Método não suportado", 405);
  if (!apiKeyValida(req)) return errorResponse("Não autorizado", 401);

  const supabase = getSupabase();
  const dias = Number(new URL(req.url).searchParams.get("dias_parado") ?? "7");

  try {
    // 1 e 2 — reusam a mesma lógica das funções resumo-pipeline e relatorio-parados
    const [visaoGeral, parados] = await Promise.all([
      resumoPipeline(supabase),
      leadsParados(supabase, Number.isNaN(dias) ? 7 : dias),
    ]);

    // 3 — histórico de movimentação dos últimos 30 dias
    const limite = new Date(Date.now() - 30 * 86_400_000).toISOString();
    const { data: movs, error: erroMov } = await supabase
      .from("atividades")
      .select("lead_id, estagio_anterior, estagio_novo, descricao, criado_em")
      .eq("tipo", "mudanca_estagio")
      .gte("criado_em", limite)
      .order("criado_em", { ascending: false });
    if (erroMov) return errorResponse(erroMov.message, 500);

    const ids = [...new Set((movs ?? []).map((m) => m.lead_id))];
    const nomePorId = new Map<string, string>();
    if (ids.length) {
      const { data: nomes } = await supabase.from("leads").select("id, nome").in("id", ids);
      (nomes ?? []).forEach((l) => nomePorId.set(l.id, l.nome));
    }
    const historico = (movs ?? []).map((m) => ({
      lead: nomePorId.get(m.lead_id) ?? null,
      lead_id: m.lead_id,
      de: m.estagio_anterior,
      para: m.estagio_novo,
      descricao: m.descricao,
      em: m.criado_em,
    }));

    // 4 — ticket médio por estágio
    const { data: leads, error: erroLeads } = await supabase
      .from("leads").select("valor, estagio").eq("excluido", false);
    if (erroLeads) return errorResponse(erroLeads.message, 500);

    const ticketPorEstagio = ESTAGIOS.map((estagio) => {
      const doEstagio = (leads ?? []).filter((l) => l.estagio === estagio);
      const soma = doEstagio.reduce((s, l) => s + Number(l.valor ?? 0), 0);
      return {
        estagio,
        quantidade: doEstagio.length,
        ticket_medio: doEstagio.length ? r2(soma / doEstagio.length) : 0,
      };
    });

    return jsonResponse({
      visao_geral_funil: visaoGeral,
      leads_parados: { dias_referencia: Number.isNaN(dias) ? 7 : dias, total: parados.length, itens: parados },
      historico_movimentacao_30dias: { total: historico.length, itens: historico },
      ticket_medio_por_estagio: ticketPorEstagio,
      gerado_em: new Date().toISOString(),
    });
  } catch (e) {
    return errorResponse(`Erro interno: ${e.message}`, 500);
  }
});
