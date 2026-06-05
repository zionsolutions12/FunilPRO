-- ===== supabase\migrations\0001_schema.sql =====

-- ============================================================
-- FunilPro â€” Schema inicial (leads + atividades)
-- Banco: Supabase (PostgreSQL)
-- ============================================================

-- ExtensÃ£o para gerar UUIDs
create extension if not exists "pgcrypto";

-- ------------------------------------------------------------
-- Tabela: leads
-- ------------------------------------------------------------
create table if not exists public.leads (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  email         text,
  telefone      text,
  empresa       text,
  valor         numeric default 0,
  estagio       text not null default 'novo'
                  check (estagio in ('novo','qualificado','proposta','negociacao','fechado')),
  temperatura   text default 'warm'
                  check (temperatura in ('hot','warm','cold','enterprise')),
  responsavel   text,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  excluido      boolean not null default false
);

create index if not exists idx_leads_estagio     on public.leads (estagio);
create index if not exists idx_leads_excluido     on public.leads (excluido);
create index if not exists idx_leads_responsavel  on public.leads (responsavel);

-- ------------------------------------------------------------
-- Tabela: atividades
-- ------------------------------------------------------------
create table if not exists public.atividades (
  id               uuid primary key default gen_random_uuid(),
  lead_id          uuid not null references public.leads(id) on delete cascade,
  tipo             text not null default 'nota'
                     check (tipo in ('mudanca_estagio','nota','contato','tarefa')),
  descricao        text,
  estagio_anterior text,
  estagio_novo     text,
  criado_em        timestamptz not null default now()
);

create index if not exists idx_atividades_lead    on public.atividades (lead_id);
create index if not exists idx_atividades_criado  on public.atividades (criado_em);

-- ------------------------------------------------------------
-- Trigger: atualiza atualizado_em automaticamente
-- ------------------------------------------------------------
create or replace function public.set_atualizado_em()
returns trigger as $$
begin
  new.atualizado_em = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_leads_atualizado_em on public.leads;
create trigger trg_leads_atualizado_em
  before update on public.leads
  for each row execute function public.set_atualizado_em();



-- ===== supabase\migrations\0002_seed.sql =====

-- ============================================================
-- FunilPro â€” Dados fictÃ­cios para demonstraÃ§Ã£o (13 leads)
-- Nomes brasileiros, valores entre R$3.200 e R$15.000.
-- ============================================================

insert into public.leads (nome, email, telefone, empresa, valor, estagio, temperatura, responsavel) values
  ('Mariana Costa',        'mariana.costa@padariadoce.com.br',  '(11) 98765-4321', 'Padaria Doce Sabor',     4200,  'novo',        'warm',       'Ana Paula'),
  ('Rafael Almeida',       'rafael@technova.com.br',            '(21) 99812-3344', 'TechNova Sistemas',      12500, 'novo',        'hot',        'Carlos Mendes'),
  ('Juliana Ferreira',     'juliana.f@estudiopilates.com',      '(31) 98444-1020', 'EstÃºdio Pilates Vida',   3200,  'novo',        'cold',       'Ana Paula'),
  ('Bruno Carvalho',       'bruno@logfast.com.br',              '(41) 99655-7788', 'LogFast Transportes',    8900,  'qualificado', 'hot',        'Carlos Mendes'),
  ('PatrÃ­cia Souza',       'patricia@belezanatural.com.br',     '(51) 98233-4455', 'Beleza Natural Spa',     5600,  'qualificado', 'warm',       'Ana Paula'),
  ('Eduardo Lima',         'eduardo.lima@construsul.com.br',     '(48) 99100-2211', 'ConstruSul Engenharia',  15000, 'qualificado', 'enterprise', 'Carlos Mendes'),
  ('Camila Rodrigues',     'camila@petshopfeliz.com',           '(11) 97654-3210', 'Pet Shop Feliz',         3800,  'proposta',    'warm',       'Ana Paula'),
  ('Thiago Nascimento',    'thiago@autopecasbr.com.br',         '(19) 98877-6655', 'Auto PeÃ§as Brasil',      9400,  'proposta',    'hot',        'Carlos Mendes'),
  ('Fernanda Oliveira',    'fernanda@clinicasorrir.com.br',      '(85) 99344-5566', 'ClÃ­nica Sorrir',         7200,  'proposta',    'warm',       'Ana Paula'),
  ('Gustavo Pereira',      'gustavo@marmorariarocha.com',       '(62) 98122-3344', 'Marmoraria Rocha',       6300,  'negociacao',  'hot',        'Carlos Mendes'),
  ('Larissa Martins',      'larissa@modaurbana.com.br',          '(81) 99655-1122', 'Moda Urbana ConfecÃ§Ãµes', 11200, 'negociacao',  'enterprise', 'Ana Paula'),
  ('Rodrigo Santos',       'rodrigo@cafedaserra.com.br',         '(54) 98455-9988', 'CafÃ© da Serra',          4800,  'fechado',     'hot',        'Carlos Mendes'),
  ('Beatriz Gomes',        'beatriz@floriculturabella.com.br',   '(11) 97233-8899', 'Floricultura Bella',     5200,  'fechado',     'warm',       'Ana Paula');

-- Algumas atividades de exemplo (registro de mudanÃ§as e contatos)
insert into public.atividades (lead_id, tipo, descricao, estagio_anterior, estagio_novo)
select id, 'mudanca_estagio', 'Lead avanÃ§ou para qualificado', 'novo', 'qualificado'
from public.leads where nome = 'Bruno Carvalho';

insert into public.atividades (lead_id, tipo, descricao)
select id, 'contato', 'Primeiro contato por telefone realizado'
from public.leads where nome = 'Rafael Almeida';

insert into public.atividades (lead_id, tipo, descricao, estagio_anterior, estagio_novo)
select id, 'mudanca_estagio', 'NegÃ³cio fechado com sucesso!', 'negociacao', 'fechado'
from public.leads where nome = 'Rodrigo Santos';



-- ===== supabase\migrations\0003_usuarios.sql =====

-- ============================================================
-- FunilPro â€” Tabela de usuÃ¡rios (autenticaÃ§Ã£o prÃ³pria)
-- Senhas sÃ£o gravadas como hash PBKDF2 (NUNCA em texto puro).
-- ============================================================

create table if not exists public.usuarios (
  id           uuid primary key default gen_random_uuid(),
  nome         text not null,
  email        text not null unique,
  senha_hash   text not null,
  papel        text not null default 'vendedor'
                 check (papel in ('admin','gestor','vendedor')),
  ativo        boolean not null default true,
  criado_em    timestamptz not null default now(),
  ultimo_login timestamptz
);

create index if not exists idx_usuarios_email on public.usuarios (email);

-- Associa cada lead a um usuÃ¡rio responsÃ¡vel (opcional)
alter table public.leads
  add column if not exists usuario_id uuid references public.usuarios(id);

create index if not exists idx_leads_usuario on public.leads (usuario_id);



