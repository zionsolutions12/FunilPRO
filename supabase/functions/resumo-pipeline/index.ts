// ============================================================
// Edge Function: resumo-pipeline
// Indicadores do funil (lógica em _shared/metricas.ts):
//   total/valor por estágio, taxa de conversão geral, ticket médio dos
//   fechados, velocidade do funil e top leads em negociação.
// ============================================================
import {
  apiKeyValida,
  errorResponse,
  getSupabase,
  handleOptions,
  jsonResponse,
} from "../_shared/utils.ts";
import { resumoPipeline } from "../_shared/metricas.ts";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();
  if (req.method !== "GET") return errorResponse("Método não suportado", 405);
  if (!apiKeyValida(req)) return errorResponse("Não autorizado", 401);

  try {
    return jsonResponse(await resumoPipeline(getSupabase()));
  } catch (e) {
    return errorResponse(`Erro interno: ${e.message}`, 500);
  }
});
