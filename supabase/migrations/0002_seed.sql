-- ============================================================
-- FunilPro — Dados fictícios para demonstração (13 leads)
-- Nomes brasileiros, valores entre R$3.200 e R$15.000.
-- ============================================================

insert into public.leads (nome, email, telefone, empresa, valor, estagio, temperatura, responsavel) values
  ('Mariana Costa',        'mariana.costa@padariadoce.com.br',  '(11) 98765-4321', 'Padaria Doce Sabor',     4200,  'novo',        'warm',       'Ana Paula'),
  ('Rafael Almeida',       'rafael@technova.com.br',            '(21) 99812-3344', 'TechNova Sistemas',      12500, 'novo',        'hot',        'Carlos Mendes'),
  ('Juliana Ferreira',     'juliana.f@estudiopilates.com',      '(31) 98444-1020', 'Estúdio Pilates Vida',   3200,  'novo',        'cold',       'Ana Paula'),
  ('Bruno Carvalho',       'bruno@logfast.com.br',              '(41) 99655-7788', 'LogFast Transportes',    8900,  'qualificado', 'hot',        'Carlos Mendes'),
  ('Patrícia Souza',       'patricia@belezanatural.com.br',     '(51) 98233-4455', 'Beleza Natural Spa',     5600,  'qualificado', 'warm',       'Ana Paula'),
  ('Eduardo Lima',         'eduardo.lima@construsul.com.br',     '(48) 99100-2211', 'ConstruSul Engenharia',  15000, 'qualificado', 'enterprise', 'Carlos Mendes'),
  ('Camila Rodrigues',     'camila@petshopfeliz.com',           '(11) 97654-3210', 'Pet Shop Feliz',         3800,  'proposta',    'warm',       'Ana Paula'),
  ('Thiago Nascimento',    'thiago@autopecasbr.com.br',         '(19) 98877-6655', 'Auto Peças Brasil',      9400,  'proposta',    'hot',        'Carlos Mendes'),
  ('Fernanda Oliveira',    'fernanda@clinicasorrir.com.br',      '(85) 99344-5566', 'Clínica Sorrir',         7200,  'proposta',    'warm',       'Ana Paula'),
  ('Gustavo Pereira',      'gustavo@marmorariarocha.com',       '(62) 98122-3344', 'Marmoraria Rocha',       6300,  'negociacao',  'hot',        'Carlos Mendes'),
  ('Larissa Martins',      'larissa@modaurbana.com.br',          '(81) 99655-1122', 'Moda Urbana Confecções', 11200, 'negociacao',  'enterprise', 'Ana Paula'),
  ('Rodrigo Santos',       'rodrigo@cafedaserra.com.br',         '(54) 98455-9988', 'Café da Serra',          4800,  'fechado',     'hot',        'Carlos Mendes'),
  ('Beatriz Gomes',        'beatriz@floriculturabella.com.br',   '(11) 97233-8899', 'Floricultura Bella',     5200,  'fechado',     'warm',       'Ana Paula');

-- Algumas atividades de exemplo (registro de mudanças e contatos)
insert into public.atividades (lead_id, tipo, descricao, estagio_anterior, estagio_novo)
select id, 'mudanca_estagio', 'Lead avançou para qualificado', 'novo', 'qualificado'
from public.leads where nome = 'Bruno Carvalho';

insert into public.atividades (lead_id, tipo, descricao)
select id, 'contato', 'Primeiro contato por telefone realizado'
from public.leads where nome = 'Rafael Almeida';

insert into public.atividades (lead_id, tipo, descricao, estagio_anterior, estagio_novo)
select id, 'mudanca_estagio', 'Negócio fechado com sucesso!', 'negociacao', 'fechado'
from public.leads where nome = 'Rodrigo Santos';
