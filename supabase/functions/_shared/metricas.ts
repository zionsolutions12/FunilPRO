// ============================================================
// Lógica de métricas compartilhada entre as funções de relatório
// (resumo-pipeline, relatorio-parados e dashboard-consolidado).
// ============================================================
import type { SupabaseClient } from "jsr:@supabase/supabase-js@2";

export const ESTAGIOS = ["novo", "qualificado", "proposta", "negociacao", "fechado"];
export const r2 = (n: number) => Number(n.toFixed(2));

// ----- Resumo do pipeline (mesma saída usada por resumo-pipeline) -----
export async function resumoPipeline(supabase: SupabaseClient) {
  const { data: leads, error } = await supabase
    .from("leads")
    .select("id, nome, empresa, valor, estagio, temperatura, responsavel, criado_em")
    .eq("excluido", false);
  if (error) throw new Error(error.message);

  const { data: atividades, error: e2 } = await supabase
    .from("atividades")
    .select("lead_id, estagio_anterior, estagio_novo, criado_em")
    .eq("tipo", "mudanca_estagio");
  if (e2) throw new Error(e2.message);

  const lista = leads ?? [];
  const total = lista.length;
  const valorTotal = lista.reduce((s, l) => s + Number(l.valor ?? 0), 0);

  const porEstagio = ESTAGIOS.map((estagio) => {
    const doEstagio = lista.filter((l) => l.estagio === estagio);
    return {
      estagio,
      quantidade: doEstagio.length,
      valor_acumulado: r2(doEstagio.reduce((s, l) => s + Number(l.valor ?? 0), 0)),
    };
  });

  const fechados = lista.filter((l) => l.estagio === "fechado");
  const taxaConversaoGeral = total > 0 ? r2((fechados.length / total) * 100) : 0;
  const valorFechados = fechados.reduce((s, l) => s + Number(l.valor ?? 0), 0);
  const ticketMedioFechados = fechados.length > 0 ? r2(valorFechados / fechados.length) : 0;

  // Velocidade do funil (tempo médio entre estágios)
  const leadMap = new Map(lista.map((l) => [l.id, l]));
  const ativPorLead = new Map<string, typeof atividades>();
  for (const a of atividades ?? []) {
    if (!ativPorLead.has(a.lead_id)) ativPorLead.set(a.lead_id, []);
    ativPorLead.get(a.lead_id)!.push(a);
  }
  const transicoes = new Map<string, { soma: number; n: number }>();
  let somaGeral = 0, nGeral = 0;
  for (const [leadId, ativs] of ativPorLead) {
    const lead = leadMap.get(leadId);
    if (!lead) continue;
    ativs.sort((a, b) => new Date(a.criado_em).getTime() - new Date(b.criado_em).getTime());
    let entradaAnterior = new Date(lead.criado_em).getTime();
    for (const a of ativs) {
      const t = new Date(a.criado_em).getTime();
      const dias = (t - entradaAnterior) / 86_400_000;
      if (dias >= 0) {
        const chave = `${a.estagio_anterior} → ${a.estagio_novo}`;
        const acc = transicoes.get(chave) ?? { soma: 0, n: 0 };
        acc.soma += dias; acc.n += 1;
        transicoes.set(chave, acc);
        somaGeral += dias; nGeral += 1;
      }
      entradaAnterior = t;
    }
  }
  const porTransicao = [...transicoes.entries()]
    .map(([transicao, v]) => ({ transicao, tempo_medio_dias: r2(v.soma / v.n), amostras: v.n }))
    .sort((a, b) => b.tempo_medio_dias - a.tempo_medio_dias);

  const topNegociacao = lista
    .filter((l) => l.estagio === "negociacao")
    .sort((a, b) => Number(b.valor ?? 0) - Number(a.valor ?? 0))
    .slice(0, 5)
    .map((l) => ({ nome: l.nome, empresa: l.empresa, valor: Number(l.valor ?? 0), temperatura: l.temperatura, responsavel: l.responsavel }));

  return {
    totais: { total_leads: total, valor_total: r2(valorTotal) },
    por_estagio: porEstagio,
    taxa_conversao_geral: taxaConversaoGeral,
    ticket_medio_fechados: ticketMedioFechados,
    velocidade_funil: {
      tempo_medio_dias: nGeral > 0 ? r2(somaGeral / nGeral) : null,
      total_movimentacoes: nGeral,
      por_transicao: porTransicao,
    },
    top_leads_negociacao: topNegociacao,
  };
}

// ----- Leads parados (mesma saída usada por relatorio-parados) -----
export async function leadsParados(supabase: SupabaseClient, dias = 7) {
  const limite = new Date(Date.now() - dias * 86_400_000).toISOString();

  const { data: leads, error } = await supabase
    .from("leads").select("*").eq("excluido", false).neq("estagio", "fechado");
  if (error) throw new Error(error.message);

  const { data: ativsRecentes, error: e2 } = await supabase
    .from("atividades").select("lead_id").gte("criado_em", limite);
  if (e2) throw new Error(e2.message);

  const comAtividade = new Set((ativsRecentes ?? []).map((a) => a.lead_id));
  return (leads ?? [])
    .filter((l) => !comAtividade.has(l.id) && l.criado_em < limite)
    .map((l) => ({
      ...l,
      dias_parado: Math.floor((Date.now() - new Date(l.atualizado_em).getTime()) / 86_400_000),
    }))
    .sort((a, b) => b.dias_parado - a.dias_parado);
}
