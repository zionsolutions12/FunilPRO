// ============================================================
// Edge Function: leads
// CRUD de leads — GET (listar), POST (criar), PUT (atualizar), DELETE (soft delete)
// ============================================================
import {
  apiKeyValida,
  errorResponse,
  getSupabase,
  handleOptions,
  jsonResponse,
} from "../_shared/utils.ts";

const ESTAGIOS = ["novo", "qualificado", "proposta", "negociacao", "fechado"];
const TEMPERATURAS = ["hot", "warm", "cold", "enterprise"];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();
  if (!apiKeyValida(req)) return errorResponse("Não autorizado", 401);

  const supabase = getSupabase();
  const url = new URL(req.url);
  // O id pode vir no path: /leads/:id
  const partes = url.pathname.split("/").filter(Boolean);
  const id = partes.length > 1 ? partes[partes.length - 1] : null;
  const idValido = id && id !== "leads" ? id : null;

  try {
    // ----- LISTAR -----
    if (req.method === "GET") {
      let query = supabase.from("leads").select("*").eq("excluido", false);

      const estagio = url.searchParams.get("estagio");
      const valorMinimo = url.searchParams.get("valor_minimo");
      const responsavel = url.searchParams.get("responsavel");

      if (estagio) query = query.eq("estagio", estagio);
      if (responsavel) query = query.eq("responsavel", responsavel);
      if (valorMinimo) query = query.gte("valor", Number(valorMinimo));

      query = query.order("criado_em", { ascending: false });

      const { data, error } = await query;
      if (error) return errorResponse(error.message, 500);
      return jsonResponse(data);
    }

    // ----- CRIAR -----
    if (req.method === "POST") {
      const body = await req.json().catch(() => null);
      if (!body || !body.nome) {
        return errorResponse("Campo obrigatório: nome", 400);
      }
      if (body.estagio && !ESTAGIOS.includes(body.estagio)) {
        return errorResponse("Estágio inválido", 400);
      }
      if (body.temperatura && !TEMPERATURAS.includes(body.temperatura)) {
        return errorResponse("Temperatura inválida", 400);
      }

      const novo = {
        nome: body.nome,
        email: body.email ?? null,
        telefone: body.telefone ?? null,
        empresa: body.empresa ?? null,
        valor: body.valor ?? 0,
        estagio: body.estagio ?? "novo",
        temperatura: body.temperatura ?? "warm",
        responsavel: body.responsavel ?? null,
      };

      const { data, error } = await supabase
        .from("leads")
        .insert(novo)
        .select()
        .single();
      if (error) return errorResponse(error.message, 500);
      return jsonResponse(data, undefined, 201);
    }

    // ----- ATUALIZAR -----
    if (req.method === "PUT") {
      if (!idValido) return errorResponse("ID do lead é obrigatório", 400);
      const body = await req.json().catch(() => null);
      if (!body) return errorResponse("Corpo da requisição inválido", 400);
      if (body.estagio && !ESTAGIOS.includes(body.estagio)) {
        return errorResponse("Estágio inválido", 400);
      }
      if (body.temperatura && !TEMPERATURAS.includes(body.temperatura)) {
        return errorResponse("Temperatura inválida", 400);
      }

      const { data, error } = await supabase
        .from("leads")
        .update(body)
        .eq("id", idValido)
        .eq("excluido", false)
        .select()
        .single();
      if (error) return errorResponse(error.message, 500);
      if (!data) return errorResponse("Lead não encontrado", 404);
      return jsonResponse(data);
    }

    // ----- SOFT DELETE -----
    if (req.method === "DELETE") {
      if (!idValido) return errorResponse("ID do lead é obrigatório", 400);
      const { data, error } = await supabase
        .from("leads")
        .update({ excluido: true })
        .eq("id", idValido)
        .select()
        .single();
      if (error) return errorResponse(error.message, 500);
      if (!data) return errorResponse("Lead não encontrado", 404);
      return jsonResponse({ mensagem: "Lead removido", id: idValido });
    }

    return errorResponse("Método não suportado", 405);
  } catch (e) {
    return errorResponse(`Erro interno: ${e.message}`, 500);
  }
});
