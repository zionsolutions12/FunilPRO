-- ============================================================
-- FunilPro — Schema inicial (leads + atividades)
-- Banco: Supabase (PostgreSQL)
-- ============================================================

-- Extensão para gerar UUIDs
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
