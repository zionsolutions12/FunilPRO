// ============================================================
// Edge Function: auth
// Rotas:
//   POST /auth/registrar  -> cria usuário { nome, email, senha }
//   POST /auth/login      -> autentica   { email, senha }  -> { usuario, token }
//   GET  /auth/me         -> dados do usuário logado (header Authorization)
// ============================================================
import {
  apiKeyValida,
  errorResponse,
  getSupabase,
  handleOptions,
  jsonResponse,
} from "../_shared/utils.ts";
import {
  criarToken,
  hashSenha,
  tokenDoHeader,
  verificarSenha,
  verificarToken,
} from "../_shared/auth.ts";

// Remove o hash antes de devolver o usuário ao cliente
function semSenha(u: Record<string, unknown>) {
  const { senha_hash: _omit, ...resto } = u;
  return resto;
}

const emailValido = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return handleOptions();
  if (!apiKeyValida(req)) return errorResponse("Não autorizado", 401);

  const supabase = getSupabase();
  const acao = new URL(req.url).pathname.split("/").filter(Boolean).pop();

  try {
    // ----- REGISTRAR -----
    if (acao === "registrar" && req.method === "POST") {
      const body = await req.json().catch(() => null);
      if (!body?.nome || !body?.email || !body?.senha) {
        return errorResponse("Campos obrigatórios: nome, email, senha", 400);
      }
      if (!emailValido(body.email)) return errorResponse("Email inválido", 400);
      if (String(body.senha).length < 6) {
        return errorResponse("A senha deve ter ao menos 6 caracteres", 400);
      }

      const email = String(body.email).toLowerCase().trim();
      const { data: existente } = await supabase
        .from("usuarios").select("id").eq("email", email).maybeSingle();
      if (existente) return errorResponse("Email já cadastrado", 409);

      const senha_hash = await hashSenha(body.senha);
      const { data, error } = await supabase
        .from("usuarios")
        .insert({ nome: body.nome.trim(), email, senha_hash, papel: body.papel ?? "vendedor" })
        .select()
        .single();
      if (error) return errorResponse(error.message, 500);

      const token = await criarToken({ sub: data.id, email: data.email, papel: data.papel });
      return jsonResponse({ usuario: semSenha(data), token }, undefined, 201);
    }

    // ----- LOGIN -----
    if (acao === "login" && req.method === "POST") {
      const body = await req.json().catch(() => null);
      if (!body?.email || !body?.senha) {
        return errorResponse("Campos obrigatórios: email, senha", 400);
      }
      const email = String(body.email).toLowerCase().trim();
      const { data: usuario } = await supabase
        .from("usuarios").select("*").eq("email", email).eq("ativo", true).maybeSingle();

      // Mensagem genérica (não revela se o email existe)
      if (!usuario || !(await verificarSenha(body.senha, usuario.senha_hash))) {
        return errorResponse("Email ou senha incorretos", 401);
      }

      await supabase.from("usuarios")
        .update({ ultimo_login: new Date().toISOString() }).eq("id", usuario.id);

      const token = await criarToken({ sub: usuario.id, email: usuario.email, papel: usuario.papel });
      return jsonResponse({ usuario: semSenha(usuario), token });
    }

    // ----- ME -----
    if (acao === "me" && req.method === "GET") {
      const token = tokenDoHeader(req);
      if (!token) return errorResponse("Token ausente", 401);
      const payload = await verificarToken(token);
      if (!payload?.sub) return errorResponse("Sessão inválida ou expirada", 401);

      const { data: usuario } = await supabase
        .from("usuarios").select("*").eq("id", payload.sub).maybeSingle();
      if (!usuario) return errorResponse("Usuário não encontrado", 404);
      return jsonResponse({ usuario: semSenha(usuario) });
    }

    return errorResponse("Rota não encontrada", 404);
  } catch (e) {
    return errorResponse(`Erro interno: ${e.message}`, 500);
  }
});
