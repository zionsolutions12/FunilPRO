// ============================================================
// Edge Function: webhook-estagio
// Registra a mudança de estágio de um lead e grava a atividade.
// Body: { lead_id, estagio_novo, descricao? }
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
  if (req.method !== "POST") return errorResponse("Método não suportado", 405);
  if (!apiKeyValida(req)) return errorResponse("Não autorizado", 401);

  const supabase = getSupabase();

  try {
    const body = await req.json().catch(() => null);
    if (!body || !body.lead_id || !body.estagio_novo) {
      return errorResponse("Campos obrigatórios: lead_id, estagio_novo", 400);
    }
    if (!ESTAGIOS.includes(body.estagio_novo)) {
      return errorResponse("Estágio inválido", 400);
    }

    // Busca o estágio atual para registrar o histórico
    const { data: lead, error: erroLead } = await supabase
      .from("leads")
      .select("id, estagio")
      .eq("id", body.lead_id)
      .eq("excluido", false)
      .single();

    if (erroLead || !lead) return errorResponse("Lead não encontrado", 404);

    const estagioAnterior = lead.estagio;
    if (estagioAnterior === body.estagio_novo) {
      return errorResponse("O lead já está neste estágio", 400);
    }

    // Atualiza o estágio do lead e já recupera o registro atualizado
    const { data: leadAtualizado, error: erroUpdate } = await supabase
      .from("leads")
      .update({ estagio: body.estagio_novo })
      .eq("id", body.lead_id)
      .select()
      .single();
    if (erroUpdate) return errorResponse(erroUpdate.message, 500);

    // Registra a atividade de mudança de estágio
    const { data: atividade, error: erroAtiv } = await supabase
      .from("atividades")
      .insert({
        lead_id: body.lead_id,
        tipo: "mudanca_estagio",
        descricao: body.descricao ??
          `Movido de ${estagioAnterior} para ${body.estagio_novo}`,
        estagio_anterior: estagioAnterior,
        estagio_novo: body.estagio_novo,
      })
      .select()
      .single();
    if (erroAtiv) return errorResponse(erroAtiv.message, 500);

    return jsonResponse({
      mensagem: "Estágio atualizado",
      lead: leadAtualizado, // dados completos e atualizados do lead
      estagio_anterior: estagioAnterior,
      estagio_novo: body.estagio_novo,
      atividade,
    });
  } catch (e) {
    return errorResponse(`Erro interno: ${e.message}`, 500);
  }
});
