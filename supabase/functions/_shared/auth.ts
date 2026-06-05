// ============================================================
// Helpers de autenticação (hash de senha + JWT)
// - Senha: PBKDF2 (SHA-256) com salt aleatório — via Web Crypto nativo
// - Sessão: JWT HS256 assinado com JWT_SECRET (fallback FUNILPRO_API_KEY)
// ============================================================
import {
  create,
  getNumericDate,
  verify,
} from "https://deno.land/x/djwt@v3.0.2/mod.ts";

const PBKDF2_ITER = 100_000;
const enc = new TextEncoder();

// ----- Base64 helpers (para Uint8Array) -----
function paraB64(bytes: Uint8Array): string {
  return btoa(String.fromCharCode(...bytes));
}
function deB64(s: string): Uint8Array {
  return Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
}

// Deriva o hash da senha com PBKDF2
async function derivar(senha: string, salt: Uint8Array, iter: number): Promise<Uint8Array> {
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(senha),
    "PBKDF2",
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" },
    baseKey,
    256,
  );
  return new Uint8Array(bits);
}

// Gera o hash no formato: pbkdf2$<iter>$<saltB64>$<hashB64>
export async function hashSenha(senha: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const hash = await derivar(senha, salt, PBKDF2_ITER);
  return `pbkdf2$${PBKDF2_ITER}$${paraB64(salt)}$${paraB64(hash)}`;
}

// Comparação em tempo constante (evita timing attacks)
function igualSeguro(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

// Verifica a senha contra o hash armazenado
export async function verificarSenha(senha: string, armazenado: string): Promise<boolean> {
  const [alg, iter, saltB64, hashB64] = armazenado.split("$");
  if (alg !== "pbkdf2") return false;
  const hash = await derivar(senha, deB64(saltB64), Number(iter));
  return igualSeguro(paraB64(hash), hashB64);
}

// ----- JWT -----
async function chaveJwt(): Promise<CryptoKey> {
  const secret = Deno.env.get("JWT_SECRET") ??
    Deno.env.get("FUNILPRO_API_KEY") ?? "funilpro-dev-secret";
  return await crypto.subtle.importKey(
    "raw",
    enc.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"],
  );
}

// Cria um token de sessão (expira em 8h)
export async function criarToken(payload: Record<string, unknown>): Promise<string> {
  const key = await chaveJwt();
  return await create(
    { alg: "HS256", typ: "JWT" },
    { ...payload, exp: getNumericDate(60 * 60 * 8) },
    key,
  );
}

// Verifica e decodifica o token; retorna o payload ou null
export async function verificarToken(token: string): Promise<Record<string, unknown> | null> {
  try {
    const key = await chaveJwt();
    return await verify(token, key);
  } catch {
    return null;
  }
}

// Extrai o token do header Authorization: Bearer <token>
export function tokenDoHeader(req: Request): string | null {
  const h = req.headers.get("authorization") ?? "";
  return h.startsWith("Bearer ") ? h.slice(7) : null;
}
