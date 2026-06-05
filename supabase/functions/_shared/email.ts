// ============================================================
// Envio de e-mail via SMTP do Gmail (denomailer).
// Requer as envs: GMAIL_USER, GMAIL_APP_PASSWORD (senha de app de 16 dígitos).
// Destino padrão: EMAIL_DESTINO (default zionsolutions12@gmail.com).
// Se as credenciais não estiverem setadas, não envia (não quebra o fluxo).
// ============================================================
import { SMTPClient } from "https://deno.land/x/denomailer@1.6.0/mod.ts";

const fmtBRL = (v: number) =>
  Number(v || 0).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export async function enviarEmailMovimentacao(
  lead: Record<string, unknown>,
  estagioAnterior: string,
  estagioNovo: string,
  descricao: string,
): Promise<{ enviado: boolean; destino?: string; motivo?: string }> {
  const user = Deno.env.get("GMAIL_USER");
  const pass = Deno.env.get("GMAIL_APP_PASSWORD");
  const destino = Deno.env.get("EMAIL_DESTINO") ?? "zionsolutions12@gmail.com";

  if (!user || !pass) {
    return { enviado: false, motivo: "GMAIL_USER/GMAIL_APP_PASSWORD não configurados" };
  }

  const client = new SMTPClient({
    connection: {
      hostname: "smtp.gmail.com",
      port: 465,
      tls: true,
      auth: { username: user, password: pass },
    },
  });

  try {
    const nome = lead.nome ?? "Lead";
    const empresa = lead.empresa ?? "—";
    const valor = fmtBRL(Number(lead.valor ?? 0));

    const html = `
      <div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:auto;border:1px solid #e2e8f0;border-radius:12px;overflow:hidden">
        <div style="background:linear-gradient(90deg,#4f46e5,#7c3aed);color:#fff;padding:16px 20px;font-size:16px;font-weight:bold">
          🔔 FunilPro — Alteração no Pipeline
        </div>
        <div style="padding:20px;color:#334155;font-size:14px;line-height:1.6">
          <p>Houve uma movimentação no funil de vendas:</p>
          <table style="width:100%;border-collapse:collapse">
            <tr><td style="color:#64748b;padding:4px 0">Lead</td><td style="font-weight:bold;text-align:right">${nome}</td></tr>
            <tr><td style="color:#64748b;padding:4px 0">Empresa</td><td style="text-align:right">${empresa}</td></tr>
            <tr><td style="color:#64748b;padding:4px 0">Valor</td><td style="text-align:right">${valor}</td></tr>
            <tr><td style="color:#64748b;padding:4px 0">Movimentação</td><td style="text-align:right"><b>${estagioAnterior}</b> → <b style="color:#7c3aed">${estagioNovo}</b></td></tr>
          </table>
          <p style="margin-top:14px;color:#64748b">${descricao}</p>
        </div>
        <div style="padding:12px 20px;background:#f8fafc;color:#94a3b8;font-size:12px">FunilPro · Mini CRM de Funil de Vendas</div>
      </div>`;

    await client.send({
      from: `FunilPro <${user}>`,
      to: destino,
      subject: `🔔 Pipeline: ${nome} mudou para ${estagioNovo}`,
      content: `${nome} (${empresa}) mudou de ${estagioAnterior} para ${estagioNovo}. Valor: ${valor}.`,
      html,
    });
    return { enviado: true, destino };
  } finally {
    await client.close();
  }
}
