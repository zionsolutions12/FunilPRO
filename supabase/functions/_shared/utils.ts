// ============================================================
// Utilitários compartilhados entre as Edge Functions
// ============================================================
import { createClient } from "jsr:@supabase/supabase-js@2";

// Cabeçalhos CORS (libera chamadas do frontend)
export const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

// Cliente Supabase com a SECRET KEY (acesso total — só no backend)
export function getSupabase() {
  return createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SECRET_KEY") ?? "",
  );
}

// Resposta JSON padronizada de sucesso
export function jsonResponse(dados: unknown, total?: number, status = 200) {
  const body = Array.isArray(dados)
    ? { dados, total: total ?? dados.length }
    : { dados };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Resposta JSON padronizada de erro
export function errorResponse(mensagem: string, codigo = 400) {
  return new Response(JSON.stringify({ erro: mensagem, codigo }), {
    status: codigo,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// Valida a API key interna (header x-api-key)
export function apiKeyValida(req: Request): boolean {
  const esperada = Deno.env.get("FUNILPRO_API_KEY");
  // Se a chave não estiver configurada no ambiente, não bloqueia (modo dev)
  if (!esperada) return true;
  return req.headers.get("x-api-key") === esperada;
}

// Atalho: responde ao preflight CORS
export function handleOptions(): Response {
  return new Response("ok", { headers: corsHeaders });
}
