// ============================================================
// Envia um e-mail com o RESUMO DO PIPELINE (só para visualizar o formato).
// Busca os dados no banco (PostgREST) e manda via SMTP Gmail (denomailer).
//   deno run -A --node-modules-dir=none docs/enviar-resumo-email.ts
// Envs: SUPABASE_URL, SUPABASE_SECRET_KEY, GMAIL_USER, GMAIL_APP_PASSWORD, EMAIL_DESTINO
// ============================================================
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const ESTAGIOS = ["novo", "qualificado", "proposta", "negociacao", "fechado"];
const ROTULO: Record<string, string> = {
  novo: "Novo", qualificado: "Qualificado", proposta: "Proposta",
  negociacao: "Negociação", fechado: "Fechado",
};
const COR: Record<string, string> = {
  novo: "#64748b", qualificado: "#3b82f6", proposta: "#8b5cf6",
  negociacao: "#f59e0b", fechado: "#10b981",
};
const brl = (v: number) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });

const url = Deno.env.get("SUPABASE_URL")!;
const key = Deno.env.get("SUPABASE_SECRET_KEY")!;
const headers = { apikey: key, Authorization: `Bearer ${key}` };

// Busca os leads ativos
const leads = await (
  await fetch(`${url}/rest/v1/leads?select=nome,empresa,valor,estagio,temperatura&excluido=eq.false`, { headers })
).json();

const total = leads.length;
const valorTotal = leads.reduce((s: number, l: any) => s + Number(l.valor ?? 0), 0);
const fechados = leads.filter((l: any) => l.estagio === "fechado");
const taxa = total ? ((fechados.length / total) * 100).toFixed(1) : "0";
const ticketFechados = fechados.length
  ? fechados.reduce((s: number, l: any) => s + Number(l.valor ?? 0), 0) / fechados.length
  : 0;

const linhasEstagio = ESTAGIOS.map((e) => {
  const doEst = leads.filter((l: any) => l.estagio === e);
  const valor = doEst.reduce((s: number, l: any) => s + Number(l.valor ?? 0), 0);
  return `<tr>
    <td style="padding:8px 0"><span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${COR[e]};margin-right:8px"></span>${ROTULO[e]}</td>
    <td style="text-align:center;color:#475569">${doEst.length}</td>
    <td style="text-align:right;font-weight:bold;color:#0f172a">${brl(valor)}</td>
  </tr>`;
}).join("");

const topNeg = leads
  .filter((l: any) => l.estagio === "negociacao")
  .sort((a: any, b: any) => Number(b.valor) - Number(a.valor))
  .slice(0, 5)
  .map((l: any, i: number) =>
    `<tr><td style="padding:6px 0">${i + 1}. <b>${l.nome}</b> <span style="color:#94a3b8">· ${l.empresa ?? "—"}</span></td><td style="text-align:right;font-weight:bold;color:#b45309">${brl(l.valor)}</td></tr>`
  ).join("") || `<tr><td colspan="2" style="color:#94a3b8;padding:6px 0">Nenhum lead em negociação.</td></tr>`;

const kpi = (rotulo: string, valor: string, cor: string) =>
  `<td style="padding:6px"><div style="background:#f8fafc;border:1px solid #e2e8f0;border-radius:10px;padding:12px;text-align:center">
    <div style="font-size:11px;color:#94a3b8;text-transform:uppercase;letter-spacing:.04em">${rotulo}</div>
    <div style="font-size:20px;font-weight:bold;color:${cor};margin-top:4px">${valor}</div>
  </div></td>`;

const html = `
<div style="font-family:Arial,Helvetica,sans-serif;max-width:600px;margin:auto;border:1px solid #e2e8f0;border-radius:14px;overflow:hidden">
  <div style="background:linear-gradient(90deg,#4f46e5,#7c3aed);color:#fff;padding:20px 24px">
    <div style="font-size:18px;font-weight:bold">📊 FunilPro — Resumo do Pipeline</div>
    <div style="font-size:13px;opacity:.85;margin-top:2px">Visão geral do seu funil de vendas</div>
  </div>
  <div style="padding:20px 24px;color:#334155">
    <table style="width:100%;border-collapse:collapse"><tr>
      ${kpi("Total de Leads", String(total), "#0f172a")}
      ${kpi("Valor em Pipeline", brl(valorTotal), "#059669")}
    </tr><tr>
      ${kpi("Conversão Geral", taxa + "%", "#4f46e5")}
      ${kpi("Ticket Médio (fechados)", brl(ticketFechados), "#0f172a")}
    </tr></table>

    <h3 style="margin:22px 0 6px;font-size:15px;color:#0f172a">Leads por estágio</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px">${linhasEstagio}</table>

    <h3 style="margin:22px 0 6px;font-size:15px;color:#0f172a">🔥 Top leads em negociação</h3>
    <table style="width:100%;border-collapse:collapse;font-size:14px">${topNeg}</table>
  </div>
  <div style="padding:12px 24px;background:#f8fafc;color:#94a3b8;font-size:12px">
    FunilPro · Mini CRM de Funil de Vendas — e-mail de demonstração
  </div>
</div>`;

const user = Deno.env.get("GMAIL_USER")!;
const pass = Deno.env.get("GMAIL_APP_PASSWORD")!;
const destino = Deno.env.get("EMAIL_DESTINO") ?? "zionsolutions12@gmail.com";

const client = new SMTPClient({
  connection: { hostname: "smtp.gmail.com", port: 465, tls: true, auth: { username: user, password: pass } },
});
await client.send({
  from: `FunilPro <${user}>`,
  to: destino,
  subject: "📊 FunilPro — Resumo do seu Pipeline",
  content: `Total de leads: ${total} | Valor: ${brl(valorTotal)} | Conversão: ${taxa}% | Ticket fechados: ${brl(ticketFechados)}`,
  html,
});
await client.close();
console.log(`E-mail de resumo enviado para ${destino}.`);
