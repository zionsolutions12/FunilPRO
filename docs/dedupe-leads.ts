// ============================================================
// Remove leads duplicados (mesmo email), mantendo 1 de cada.
//   deno run -A --node-modules-dir=none docs/dedupe-leads.ts
// Envs: SUPABASE_URL, SUPABASE_SECRET_KEY
// ============================================================
const url = Deno.env.get("SUPABASE_URL");
const key = Deno.env.get("SUPABASE_SECRET_KEY");
if (!url || !key) { console.error("Defina SUPABASE_URL e SUPABASE_SECRET_KEY"); Deno.exit(1); }
const headers = { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json" };

const leads = await (await fetch(`${url}/rest/v1/leads?select=id,email,nome`, { headers })).json();

const porEmail = {};
for (const l of leads) {
  if (!l.email) continue;
  (porEmail[l.email] ??= []).push(l);
}

const excluir = [];
for (const email in porEmail) {
  const arr = porEmail[email].sort((a, b) => (a.id < b.id ? -1 : 1));
  arr.slice(1).forEach((l) => excluir.push(l)); // mantém o primeiro, marca o resto
}

console.log(`Total de leads: ${leads.length} · duplicados a remover: ${excluir.length}`);
for (const l of excluir) {
  const r = await fetch(`${url}/rest/v1/leads?id=eq.${l.id}`, { method: "DELETE", headers });
  if (!r.ok) console.error(`Falha ao remover ${l.nome} (${l.id}): ${r.status}`);
}

const cnt = await fetch(`${url}/rest/v1/leads?select=id`, {
  headers: { ...headers, Prefer: "count=exact", Range: "0-0" },
});
console.log(`Concluído. Total de leads agora: ${cnt.headers.get("content-range")}`);
