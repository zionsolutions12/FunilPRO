-- ============================================================
-- FunilPro — Tabela de usuários (autenticação própria)
-- Senhas são gravadas como hash PBKDF2 (NUNCA em texto puro).
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

-- Associa cada lead a um usuário responsável (opcional)
alter table public.leads
  add column if not exists usuario_id uuid references public.usuarios(id);

create index if not exists idx_leads_usuario on public.leads (usuario_id);
