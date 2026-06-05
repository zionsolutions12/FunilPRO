// ============================================================
// Corrige a codificação dos dados: regenera o setup-banco.sql (lendo
// as migrations via Deno, UTF-8 correto), limpa e re-semeia o banco.
//   deno run -A --node-modules-dir=none docs/corrigir-banco.ts
// ============================================================
import postgres from "npm:postgres@3";

const REF = "qsecahzfqrqdgszuqvbn";
const senha = Deno.env.get("PGPASSWORD");
if (!senha) { console.error("Defina PGPASSWORD"); Deno.exit(1); }

// Lê as migrations originais (Deno decodifica UTF-8 corretamente)
const schema = await Deno.readTextFile("supabase/migrations/0001_schema.sql");
const seed = await Deno.readTextFile("supabase/migrations/0002_seed.sql");
const usuarios = await Deno.readTextFile("supabase/migrations/0003_usuarios.sql");

// Regenera o setup-banco.sql CORRETO (sem BOM, UTF-8)
await Deno.writeTextFile(
  "docs/setup-banco.sql",
  `-- Gerado a partir das migrations (UTF-8 correto)\n\n${schema}\n\n${seed}\n\n${usuarios}\n`,
);
console.log("setup-banco.sql regenerado (UTF-8 correto).");

const sql = postgres({
  host: `db.${REF}.supabase.co`, port: 5432, database: "postgres",
  username: "postgres", password: senha, ssl: "require", max: 1, prepare: false,
});

try {
  await sql.unsafe(schema);    // idempotente (if not exists)
  await sql.unsafe(usuarios);  // idempotente
  await sql.unsafe("delete from public.atividades; delete from public.leads;");
  await sql.unsafe(seed);      // re-semeia com os dados corretos
  const rows = await sql`select nome, empresa from public.leads order by empresa`;
  console.log("\n--- Conferência (empresa) ---");
  for (const r of rows) console.log(`  ${r.empresa}`);
  console.log(`\nOK — ${rows.length} leads re-semeados com acentuação correta.`);
} catch (e) {
  console.error("ERRO:", e.message);
  Deno.exit(1);
} finally {
  await sql.end();
}
