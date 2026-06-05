// ============================================================
// Insere leads adicionais (demo enriquecido) no banco via PostgREST.
//   deno run -A --node-modules-dir=none docs/adicionar-leads.ts
// Envs: SUPABASE_URL, SUPABASE_SECRET_KEY
// ============================================================
const url = Deno.env.get("SUPABASE_URL");
const key = Deno.env.get("SUPABASE_SECRET_KEY");
if (!url || !key) { console.error("Defina SUPABASE_URL e SUPABASE_SECRET_KEY"); Deno.exit(1); }

const novos = [
  { nome: "Carlos Eduardo Pinto", empresa: "Pinto Advocacia",        valor: 8500,  estagio: "qualificado", temperatura: "warm",       responsavel: "Ana Paula",     email: "carlos@pintoadv.com.br",        telefone: "(11) 98111-2233", criado_em: "2026-01-08T10:00:00Z" },
  { nome: "Sandra Regina Alves",  empresa: "Alves Contabilidade",    valor: 6200,  estagio: "fechado",     temperatura: "warm",       responsavel: "Carlos Mendes", email: "sandra@alvescont.com.br",       telefone: "(21) 98222-3344", criado_em: "2026-01-14T10:00:00Z" },
  { nome: "Marcos Vinícius Dias", empresa: "Dias Tecnologia",        valor: 22000, estagio: "negociacao",  temperatura: "hot",        responsavel: "Ana Paula",     email: "marcos@diastech.com.br",        telefone: "(31) 98333-4455", criado_em: "2026-01-21T10:00:00Z" },
  { nome: "Aline Cristina Ramos", empresa: "Studio Aline",           valor: 3500,  estagio: "novo",        temperatura: "cold",       responsavel: "Carlos Mendes", email: "aline@studioaline.com",         telefone: "(41) 98444-5566", criado_em: "2026-01-27T10:00:00Z" },
  { nome: "Paulo Henrique Cruz",  empresa: "Cruz Logística",         valor: 14000, estagio: "proposta",    temperatura: "hot",        responsavel: "Ana Paula",     email: "paulo@cruzlog.com.br",          telefone: "(51) 98555-6677", criado_em: "2026-02-04T10:00:00Z" },
  { nome: "Vanessa Lima",         empresa: "Boutique Vanessa",       valor: 4100,  estagio: "fechado",     temperatura: "warm",       responsavel: "Carlos Mendes", email: "vanessa@boutiquevanessa.com",   telefone: "(11) 98666-7788", criado_em: "2026-02-10T10:00:00Z" },
  { nome: "Roberto Carlos Mota",  empresa: "Mota Imóveis",           valor: 17500, estagio: "qualificado", temperatura: "hot",        responsavel: "Ana Paula",     email: "roberto@motaimoveis.com.br",    telefone: "(62) 98777-8899", criado_em: "2026-02-17T10:00:00Z" },
  { nome: "Débora Santos",        empresa: "Clínica Débora",         valor: 9800,  estagio: "proposta",    temperatura: "warm",       responsavel: "Carlos Mendes", email: "debora@clinicadebora.com.br",   telefone: "(85) 98888-9900", criado_em: "2026-02-25T10:00:00Z" },
  { nome: "Felipe Andrade",       empresa: "Andrade Esportes",       valor: 5400,  estagio: "novo",        temperatura: "warm",       responsavel: "Ana Paula",     email: "felipe@andradeesportes.com",    telefone: "(48) 98999-0011", criado_em: "2026-03-03T10:00:00Z" },
  { nome: "Tatiane Moreira",      empresa: "Moreira Cosméticos",     valor: 7600,  estagio: "qualificado", temperatura: "cold",       responsavel: "Carlos Mendes", email: "tatiane@moreiracosm.com.br",    telefone: "(19) 98010-1122", criado_em: "2026-03-11T10:00:00Z" },
  { nome: "Ricardo Nunes",        empresa: "Nunes Engenharia",       valor: 28000, estagio: "negociacao",  temperatura: "enterprise", responsavel: "Ana Paula",     email: "ricardo@nuneseng.com.br",       telefone: "(54) 98121-2233", criado_em: "2026-03-18T10:00:00Z" },
  { nome: "Cláudia Barbosa",      empresa: "Barbosa Eventos",        valor: 11500, estagio: "fechado",     temperatura: "hot",        responsavel: "Carlos Mendes", email: "claudia@barbosaeventos.com.br", telefone: "(81) 98232-3344", criado_em: "2026-03-26T10:00:00Z" },
  { nome: "Anderson Teixeira",    empresa: "Teixeira Auto Center",   valor: 8200,  estagio: "proposta",    temperatura: "warm",       responsavel: "Ana Paula",     email: "anderson@teixeiraauto.com.br",  telefone: "(11) 98343-4455", criado_em: "2026-04-02T10:00:00Z" },
  { nome: "Priscila Fernandes",   empresa: "Fernandes Moda",         valor: 6700,  estagio: "qualificado", temperatura: "warm",       responsavel: "Carlos Mendes", email: "priscila@fernandesmoda.com.br", telefone: "(21) 98454-5566", criado_em: "2026-04-09T10:00:00Z" },
  { nome: "Leonardo Castro",      empresa: "Castro Consultoria",     valor: 19000, estagio: "negociacao",  temperatura: "enterprise", responsavel: "Ana Paula",     email: "leonardo@castroconsult.com.br", telefone: "(31) 98565-6677", criado_em: "2026-04-16T10:00:00Z" },
  { nome: "Renata Cardoso",       empresa: "Cardoso Decorações",     valor: 9300,  estagio: "novo",        temperatura: "hot",        responsavel: "Carlos Mendes", email: "renata@cardosodecor.com.br",    telefone: "(41) 98676-7788", criado_em: "2026-04-23T10:00:00Z" },
  { nome: "Gabriel Monteiro",     empresa: "Monteiro Distribuidora", valor: 24500, estagio: "fechado",     temperatura: "enterprise", responsavel: "Ana Paula",     email: "gabriel@monteirodist.com.br",   telefone: "(51) 98787-8899", criado_em: "2026-05-05T10:00:00Z" },
  { nome: "Juliana Pires",        empresa: "Pires Odontologia",      valor: 7100,  estagio: "proposta",    temperatura: "warm",       responsavel: "Carlos Mendes", email: "juliana@piresodonto.com.br",    telefone: "(62) 98898-9900", criado_em: "2026-05-13T10:00:00Z" },
  { nome: "Fábio Rocha",          empresa: "Rocha Construções",      valor: 16800, estagio: "negociacao",  temperatura: "hot",        responsavel: "Ana Paula",     email: "fabio@rochaconstrucoes.com.br", telefone: "(85) 98909-0011", criado_em: "2026-05-20T10:00:00Z" },
  { nome: "Simone Azevedo",       empresa: "Azevedo Joias",          valor: 13200, estagio: "qualificado", temperatura: "hot",        responsavel: "Carlos Mendes", email: "simone@azevedojoias.com.br",    telefone: "(48) 98011-1213", criado_em: "2026-05-28T10:00:00Z" },
  { nome: "Diego Martins",        empresa: "Martins Fitness",        valor: 5900,  estagio: "novo",        temperatura: "warm",       responsavel: "Ana Paula",     email: "diego@martinsfitness.com.br",   telefone: "(19) 98122-1314", criado_em: "2026-06-02T10:00:00Z" },
  { nome: "Camila Borges",        empresa: "Borges Pet",             valor: 4600,  estagio: "fechado",     temperatura: "cold",       responsavel: "Carlos Mendes", email: "camila@borgespet.com.br",       telefone: "(54) 98233-1415", criado_em: "2026-06-04T10:00:00Z" },
];

const resp = await fetch(`${url}/rest/v1/leads`, {
  method: "POST",
  headers: {
    apikey: key, Authorization: `Bearer ${key}`,
    "Content-Type": "application/json", Prefer: "return=minimal",
  },
  body: JSON.stringify(novos),
});

if (!resp.ok) { console.error("ERRO", resp.status, await resp.text()); Deno.exit(1); }

const cnt = await fetch(`${url}/rest/v1/leads?select=id&excluido=eq.false`, {
  headers: { apikey: key, Authorization: `Bearer ${key}`, Prefer: "count=exact", Range: "0-0" },
});
console.log(`Inseridos ${novos.length} leads. Total de leads ativos agora: ${cnt.headers.get("content-range")}`);
