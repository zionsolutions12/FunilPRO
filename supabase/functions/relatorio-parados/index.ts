// ============================================================
// Edge Function: relatorio-parados
// Lista leads sem atividade nos últimos N dias (param: dias=7), não
// fechados. Lógica em _shared/metricas.ts.
// ============================================================
import {
  apiKeyValida,
  errorResponse,
  getSupabase,
  handleOptions,
  jsonResponse,
} from "../_shared/utils.ts";
import { leadsParados } from "../_shared/metricas.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();
  if (req.method !== "GET") return errorResponse("Método não suportado", 405);
  if (!apiKeyValida(req)) return errorResponse("Não autorizado", 401);

  const dias = Number(new URL(req.url).searchParams.get("dias") ?? "7");
  if (Number.isNaN(dias) || dias < 0) return errorResponse("Parâmetro 'dias' inválido", 400);

  try {
    return jsonResponse(await leadsParados(getSupabase(), dias));
  } catch (e) {
    return errorResponse(`Erro interno: ${e.message}`, 500);
  }
});
