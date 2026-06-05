// ============================================================
// Edge Function: resumo-pipeline
// Retorna indicadores do funil:
//   1. Total de leads por estágio + valor acumulado
//   2. Taxa de conversão geral
//   3. Ticket médio dos leads fechados
//   4. Velocidade do funil (tempo médio entre estágios) — via atividades
//   5. Top leads por valor em negociação
// ============================================================
import {
  apiKeyValida,
  errorResponse,
  getSupabase,
  handleOptions,
  jsonResponse,
} from "../_shared/utils.ts";

const ESTAGIOS = ["novo", "qualificado", "proposta", "negociacao", "fechado"];
const r2 = (n: number) => Number(n.toFixed(2));

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();
  if (req.method !== "GET") return errorResponse("Método não suportado", 405);
  if (!apiKeyValida(req)) return errorResponse("Não autorizado", 401);

  const supabase = getSupabase();

  try {
    // Leads ativos
    const { data: leads, error: erroLeads } = await supabase
      .from("leads")
      .select("id, nome, empresa, valor, estagio, temperatura, responsavel, criado_em")
      .eq("excluido", false);
    if (erroLeads) return errorResponse(erroLeads.message, 500);

    // Atividades de mudança de estágio (para a velocidade do funil)
    const { data: atividades, error: erroAtiv } = await supabase
      .from("atividades")
      .select("lead_id, estagio_anterior, estagio_novo, criado_em")
      .eq("tipo", "mudanca_estagio");
    if (erroAtiv) return errorResponse(erroAtiv.message, 500);

    const lista = leads ?? [];
    const total = lista.length;
    const valorTotal = lista.reduce((s, l) => s + Number(l.valor ?? 0), 0);

    // 1) Total por estágio + valor acumulado
    const porEstagio = ESTAGIOS.map((estagio) => {
      const doEstagio = lista.filter((l) => l.estagio === estagio);
      return {
        estagio,
        quantidade: doEstagio.length,
        valor_acumulado: r2(doEstagio.reduce((s, l) => s + Number(l.valor ?? 0), 0)),
      };
    });

    // 2) Taxa de conversão geral (fechados / total)
    const fechados = lista.filter((l) => l.estagio === "fechado");
    const taxaConversaoGeral = total > 0 ? r2((fechados.length / total) * 100) : 0;

    // 3) Ticket médio dos leads FECHADOS
    const valorFechados = fechados.reduce((s, l) => s + Number(l.valor ?? 0), 0);
    const ticketMedioFechados = fechados.length > 0
      ? r2(valorFechados / fechados.length)
      : 0;

    // 4) Velocidade do funil — tempo médio (dias) em cada transição de estágio
    const leadMap = new Map(lista.map((l) => [l.id, l]));
    const ativPorLead = new Map<string, typeof atividades>();
    for (const a of atividades ?? []) {
      if (!ativPorLead.has(a.lead_id)) ativPorLead.set(a.lead_id, []);
      ativPorLead.get(a.lead_id)!.push(a);
    }

    const transicoes = new Map<string, { soma: number; n: number }>();
    let somaGeral = 0;
    let nGeral = 0;

    for (const [leadId, ativs] of ativPorLead) {
      const lead = leadMap.get(leadId);
      if (!lead) continue;
      ativs.sort((a, b) =>
        new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime()
      );
      // O lead entra no 1º estágio no seu criado_em
      let entradaAnterior = new Date(lead.criado_em).getTime();
      for (const a of ativs) {
        const t = new Date(a.criado_em).getTime();
        const dias = (t - entradaAnterior) / 86_400_000;
        if (dias >= 0) {
          const chave = `${a.estagio_anterior} → ${a.estagio_novo}`;
          const acc = transicoes.get(chave) ?? { soma: 0, n: 0 };
          acc.soma += dias;
          acc.n += 1;
          transicoes.set(chave, acc);
          somaGeral += dias;
          nGeral += 1;
        }
        entradaAnterior = t; // agora entrou no estágio de destino
      }
    }

    const porTransicao = [...transicoes.entries()].map(([transicao, v]) => ({
      transicao,
      tempo_medio_dias: r2(v.soma / v.n),
      amostras: v.n,
    })).sort((a, b) => b.tempo_medio_dias - a.tempo_medio_dias);

    const velocidadeFunil = {
      tempo_medio_dias: nGeral > 0 ? r2(somaGeral / nGeral) : null,
      total_movimentacoes: nGeral,
      por_transicao: porTransicao,
    };

    // 5) Top leads por valor em negociação
    const topNegociacao = lista
      .filter((l) => l.estagio === "negociacao")
      .sort((a, b) => Number(b.valor ?? 0) - Number(a.valor ?? 0))
      .slice(0, 5)
      .map((l) => ({
        nome: l.nome,
        empresa: l.empresa,
        valor: Number(l.valor ?? 0),
        temperatura: l.temperatura,
        responsavel: l.responsavel,
      }));

    return jsonResponse({
      totais: { total_leads: total, valor_total: r2(valorTotal) },
      por_estagio: porEstagio,
      taxa_conversao_geral: taxaConversaoGeral,
      ticket_medio_fechados: ticketMedioFechados,
      velocidade_funil: velocidadeFunil,
      top_leads_negociacao: topNegociacao,
    });
  } catch (e) {
    return errorResponse(`Erro interno: ${e.message}`, 500);
  }
});
