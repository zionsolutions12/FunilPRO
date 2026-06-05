// ============================================================
// Cria as tabelas do FunilPro rodando o setup-banco.sql no Postgres
// do Supabase. Senha via env PGPASSWORD (sem precisar montar URL).
//   deno run -A --node-modules-dir=none docs/criar-tabelas.ts
// ============================================================
import postgres from "npm:postgres@3";

const REF = "qsecahzfqrqdgszuqvbn";
const senha = Deno.env.get("PGPASSWORD");
if (!senha) {
  console.error("Defina PGPASSWORD");
  Deno.exit(1);
}

// Candidatos de conexão (tenta na ordem até um conectar)
const regioes = ["sa-east-1", "us-east-1", "us-east-2", "us-west-1", "eu-central-1", "ap-southeast-1"];
const candidatos = [
  { nome: "direct", host: `db.${REF}.supabase.co`, port: 5432, username: "postgres" },
];
for (const aws of ["aws-0", "aws-1"]) {
  for (const r of regioes) {
    candidatos.push({ nome: `pooler ${aws} ${r}`, host: `${aws}-${r}.pooler.supabase.com`, port: 5432, username: `postgres.${REF}` });
  }
}

// Lê o SQL e remove BOM/marcas invisíveis que quebram o parser do Postgres
let ddl = await Deno.readTextFile("docs/setup-banco.sql");
if (ddl.charCodeAt(0) === 0xFEFF) ddl = ddl.slice(1);
ddl = ddl.split(String.fromCharCode(0xFEFF)).join("");

let conectado = null;
for (const c of candidatos) {
  try {
    const sql = postgres({
      host: c.host, port: c.port, database: "postgres",
      username: c.username, password: senha,
      ssl: "require", max: 1, connect_timeout: 8, prepare: false,
    });
    await sql`select 1`;
    console.log(`Conectado via: ${c.nome} (${c.host})`);
    conectado = sql;
    break;
  } catch (e) {
    console.log(`  falhou ${c.nome}: ${e.message}`);
  }
}

if (!conectado) {
  console.error("Não consegui conectar. Pegue a connection string (Session pooler) no painel e me mande.");
  Deno.exit(1);
}

try {
  await conectado.unsafe(ddl);
  const [{ count }] = await conectado`select count(*)::int as count from public.leads`;
  console.log(`OK — tabelas criadas. Leads na tabela: ${count}`);
} catch (e) {
  console.error("ERRO ao rodar o SQL:", e.message);
  Deno.exit(1);
} finally {
  await conectado.end();
}
