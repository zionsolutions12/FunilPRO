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

// Cliente Supabase com chave de acesso total (só no backend).
// Em produção o Supabase injeta SUPABASE_SERVICE_ROLE_KEY automaticamente
// (não é permitido criar secrets com prefixo SUPABASE_). Localmente, cai
// no SUPABASE_SECRET_KEY do .env.
export function getSupabase() {
  const chave = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ??
    Deno.env.get("SUPABASE_SECRET_KEY") ?? "";
  return createClient(Deno.env.get("SUPABASE_URL") ?? "", chave);
}

// Resposta JSON padronizada de sucesso
export function jsonResponse(dados: unknown, total?: number, status = 200) {
  const body = Array.isArray(dados)
    ? { dados, total: total ?? dados.length }
    : { dados };
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

// Resposta JSON padronizada de erro
export function errorResponse(mensagem: string, codigo = 400) {
  return new Response(JSON.stringify({ erro: mensagem, codigo }), {
    status: codigo,
    headers: { ...corsHeaders, "Content-Type": "application/json; charset=utf-8" },
  });
}

// Comparação em tempo constante (evita timing attacks na checagem da key)
function igualSeguro(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Valida o header x-api-key contra a FUNILPRO_API_KEY do ambiente (.env).
// Fail-closed: sem a chave configurada OU sem header, bloqueia.
export function apiKeyValida(req: Request): boolean {
  const esperada = Deno.env.get("FUNILPRO_API_KEY");
  const recebida = req.headers.get("x-api-key");
  if (!esperada || !recebida) return false;
  return igualSeguro(recebida, esperada);
}

// Atalho: responde ao preflight CORS
export function handleOptions(): Response {
  return new Response("ok", { headers: corsHeaders });
}
