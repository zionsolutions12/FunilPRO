// ============================================================
// FunilPro — lógica do frontend
// - Renderiza o pipeline (kanban) com drag-and-drop
// - Calcula métricas
// - CRUD de leads + análise IA
// - Funciona em MODO DEMO (dados locais) ou CONECTADO (Edge Functions)
// ============================================================

// ----- Configuração de estágios -----
const ESTAGIOS = [
  { id: 'novo',        titulo: 'Novo',        cor: '#64748b' },
  { id: 'qualificado', titulo: 'Qualificado', cor: '#3b82f6' },
  { id: 'proposta',    titulo: 'Proposta',    cor: '#8b5cf6' },
  { id: 'negociacao',  titulo: 'Negociação',  cor: '#f59e0b' },
  { id: 'fechado',     titulo: 'Fechado',     cor: '#10b981' },
];

const TEMP_LABEL = { hot: '🔥 Hot', warm: '🌤️ Warm', cold: '❄️ Cold', enterprise: '🏢 Enterprise' };

// ----- Detecta modo (demo x conectado) -----
const cfg = window.FUNILPRO_CONFIG || {};
const CONECTADO = cfg.FUNCTIONS_URL &&
  !cfg.FUNCTIONS_URL.includes('SEU-PROJETO') &&
  cfg.API_KEY && !cfg.API_KEY.includes('COLOQUE');

// ----- Estado em memória -----
let leads = [];

// ----- Dados fictícios para o modo demo (espelham o seed do banco) -----
const DEMO_LEADS = [
  { nome: 'Mariana Costa',     empresa: 'Padaria Doce Sabor',     valor: 4200,  estagio: 'novo',        temperatura: 'warm',       responsavel: 'Ana Paula',     email: 'mariana.costa@padariadoce.com.br', telefone: '(11) 98765-4321' },
  { nome: 'Rafael Almeida',    empresa: 'TechNova Sistemas',      valor: 12500, estagio: 'novo',        temperatura: 'hot',        responsavel: 'Carlos Mendes', email: 'rafael@technova.com.br',           telefone: '(21) 99812-3344' },
  { nome: 'Juliana Ferreira',  empresa: 'Estúdio Pilates Vida',   valor: 3200,  estagio: 'novo',        temperatura: 'cold',       responsavel: 'Ana Paula',     email: 'juliana.f@estudiopilates.com',     telefone: '(31) 98444-1020' },
  { nome: 'Bruno Carvalho',    empresa: 'LogFast Transportes',    valor: 8900,  estagio: 'qualificado', temperatura: 'hot',        responsavel: 'Carlos Mendes', email: 'bruno@logfast.com.br',             telefone: '(41) 99655-7788' },
  { nome: 'Patrícia Souza',    empresa: 'Beleza Natural Spa',     valor: 5600,  estagio: 'qualificado', temperatura: 'warm',       responsavel: 'Ana Paula',     email: 'patricia@belezanatural.com.br',    telefone: '(51) 98233-4455' },
  { nome: 'Eduardo Lima',      empresa: 'ConstruSul Engenharia',  valor: 15000, estagio: 'qualificado', temperatura: 'enterprise', responsavel: 'Carlos Mendes', email: 'eduardo.lima@construsul.com.br',   telefone: '(48) 99100-2211' },
  { nome: 'Camila Rodrigues',  empresa: 'Pet Shop Feliz',         valor: 3800,  estagio: 'proposta',    temperatura: 'warm',       responsavel: 'Ana Paula',     email: 'camila@petshopfeliz.com',          telefone: '(11) 97654-3210' },
  { nome: 'Thiago Nascimento', empresa: 'Auto Peças Brasil',      valor: 9400,  estagio: 'proposta',    temperatura: 'hot',        responsavel: 'Carlos Mendes', email: 'thiago@autopecasbr.com.br',        telefone: '(19) 98877-6655' },
  { nome: 'Fernanda Oliveira', empresa: 'Clínica Sorrir',         valor: 7200,  estagio: 'proposta',    temperatura: 'warm',       responsavel: 'Ana Paula',     email: 'fernanda@clinicasorrir.com.br',    telefone: '(85) 99344-5566' },
  { nome: 'Gustavo Pereira',   empresa: 'Marmoraria Rocha',       valor: 6300,  estagio: 'negociacao',  temperatura: 'hot',        responsavel: 'Carlos Mendes', email: 'gustavo@marmorariarocha.com',      telefone: '(62) 98122-3344' },
  { nome: 'Larissa Martins',   empresa: 'Moda Urbana Confecções', valor: 11200, estagio: 'negociacao',  temperatura: 'enterprise', responsavel: 'Ana Paula',     email: 'larissa@modaurbana.com.br',        telefone: '(81) 99655-1122' },
  { nome: 'Rodrigo Santos',    empresa: 'Café da Serra',          valor: 4800,  estagio: 'fechado',     temperatura: 'hot',        responsavel: 'Carlos Mendes', email: 'rodrigo@cafedaserra.com.br',       telefone: '(54) 98455-9988' },
  { nome: 'Beatriz Gomes',     empresa: 'Floricultura Bella',     valor: 5200,  estagio: 'fechado',     temperatura: 'warm',       responsavel: 'Ana Paula',     email: 'beatriz@floriculturabella.com.br', telefone: '(11) 97233-8899' },
].map((l, i) => ({ id: `demo-${i + 1}`, criado_em: new Date().toISOString(), ...l }));

// ----- Helpers -----
const $ = (sel) => document.querySelector(sel);
const fmtBRL = (v) =>
  Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });

function toast(msg) {
  const t = $('#toast');
  t.querySelector('div').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

// Chamada às Edge Functions (modo conectado)
async function api(rota, opcoes = {}) {
  const resp = await fetch(`${cfg.FUNCTIONS_URL}/${rota}`, {
    ...opcoes,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': cfg.API_KEY,
      ...(opcoes.headers || {}),
    },
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(json.erro || `Erro ${resp.status}`);
  return json;
}

// ----- Carregar leads -----
async function carregarLeads() {
  if (!CONECTADO) {
    leads = [...DEMO_LEADS];
    return;
  }
  try {
    const { dados } = await api('leads');
    leads = dados || [];
  } catch (e) {
    toast(`Falha ao carregar: ${e.message} — usando demo`);
    leads = [...DEMO_LEADS];
  }
}

// ----- Métricas -----
function renderMetricas() {
  const total = leads.length;
  const valorTotal = leads.reduce((s, l) => s + Number(l.valor || 0), 0);
  const fechados = leads.filter((l) => l.estagio === 'fechado').length;
  const ticket = total ? valorTotal / total : 0;
  const conversao = total ? (fechados / total) * 100 : 0;

  $('#m-total').textContent = total;
  $('#m-valor').textContent = fmtBRL(valorTotal);
  $('#m-ticket').textContent = fmtBRL(ticket);
  $('#m-conversao').textContent = `${conversao.toFixed(1)}%`;
}

// ----- Render do pipeline -----
function renderPipeline() {
  const wrap = $('#pipeline');
  wrap.innerHTML = '';

  ESTAGIOS.forEach((est) => {
    const doEstagio = leads.filter((l) => l.estagio === est.id);
    const valor = doEstagio.reduce((s, l) => s + Number(l.valor || 0), 0);

    const col = document.createElement('div');
    col.className = 'coluna';
    col.dataset.estagio = est.id;
    col.innerHTML = `
      <div class="px-3 py-3 border-b border-slate-200 flex items-center justify-between">
        <div class="flex items-center gap-2">
          <span class="w-2.5 h-2.5 rounded-full" style="background:${est.cor}"></span>
          <span class="font-semibold text-sm text-slate-700">${est.titulo}</span>
          <span class="text-xs text-slate-400 bg-white border border-slate-200 rounded-full px-1.5">${doEstagio.length}</span>
        </div>
        <span class="text-xs font-medium text-slate-500">${fmtBRL(valor)}</span>
      </div>
      <div class="coluna-lista" data-lista="${est.id}"></div>`;
    wrap.appendChild(col);

    const lista = col.querySelector('.coluna-lista');
    doEstagio.forEach((lead) => lista.appendChild(criarCard(lead)));

    // Eventos de drop na coluna
    col.addEventListener('dragover', (e) => {
      e.preventDefault();
      col.classList.add('drag-over');
    });
    col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
    col.addEventListener('drop', (e) => {
      e.preventDefault();
      col.classList.remove('drag-over');
      const id = e.dataTransfer.getData('text/plain');
      moverLead(id, est.id);
    });
  });
}

function criarCard(lead) {
  const card = document.createElement('div');
  card.className = 'card';
  card.draggable = true;
  card.dataset.id = lead.id;
  card.innerHTML = `
    <div class="flex items-start justify-between gap-2">
      <p class="font-semibold text-sm text-slate-800 leading-tight">${lead.nome}</p>
      <span class="temp temp-${lead.temperatura}">${TEMP_LABEL[lead.temperatura] || lead.temperatura}</span>
    </div>
    <p class="text-xs text-slate-500 mt-0.5">${lead.empresa || '—'}</p>
    <div class="flex items-center justify-between mt-2.5">
      <span class="text-sm font-bold text-emerald-600">${fmtBRL(lead.valor)}</span>
      <span class="text-[11px] text-slate-400">${lead.responsavel || ''}</span>
    </div>`;

  card.addEventListener('dragstart', (e) => {
    e.dataTransfer.setData('text/plain', lead.id);
    card.classList.add('dragging');
  });
  card.addEventListener('dragend', () => card.classList.remove('dragging'));
  card.addEventListener('click', () => abrirModalLead(lead));
  return card;
}

// ----- Mover lead de estágio (drag-and-drop) -----
async function moverLead(id, novoEstagio) {
  const lead = leads.find((l) => String(l.id) === String(id));
  if (!lead || lead.estagio === novoEstagio) return;

  const anterior = lead.estagio;
  lead.estagio = novoEstagio; // atualização otimista
  renderPipeline();
  renderMetricas();

  if (CONECTADO) {
    try {
      await api('webhook-estagio', {
        method: 'POST',
        body: JSON.stringify({ lead_id: id, estagio_novo: novoEstagio }),
      });
    } catch (e) {
      lead.estagio = anterior; // rollback
      renderPipeline();
      renderMetricas();
      toast(`Erro ao mover: ${e.message}`);
      return;
    }
  }
  toast(`${lead.nome}: ${anterior} → ${novoEstagio}`);
}

// ----- Modal de lead -----
function abrirModalLead(lead = null) {
  $('#modal-titulo').textContent = lead ? 'Editar Lead' : 'Novo Lead';
  $('#f-id').value = lead?.id || '';
  $('#f-nome').value = lead?.nome || '';
  $('#f-email').value = lead?.email || '';
  $('#f-telefone').value = lead?.telefone || '';
  $('#f-empresa').value = lead?.empresa || '';
  $('#f-valor').value = lead?.valor || '';
  $('#f-responsavel').value = lead?.responsavel || '';
  $('#f-estagio').value = lead?.estagio || 'novo';
  $('#f-temperatura').value = lead?.temperatura || 'warm';
  $('#btn-excluir').classList.toggle('hidden', !lead);
  $('#modal-lead').classList.add('modal-show');
}

function fecharModais() {
  document.querySelectorAll('.modal-show').forEach((m) => m.classList.remove('modal-show'));
}

async function salvarLead(e) {
  e.preventDefault();
  const id = $('#f-id').value;
  const dados = {
    nome: $('#f-nome').value.trim(),
    email: $('#f-email').value.trim(),
    telefone: $('#f-telefone').value.trim(),
    empresa: $('#f-empresa').value.trim(),
    valor: Number($('#f-valor').value || 0),
    responsavel: $('#f-responsavel').value.trim(),
    estagio: $('#f-estagio').value,
    temperatura: $('#f-temperatura').value,
  };
  if (!dados.nome) return toast('Nome é obrigatório');

  if (CONECTADO) {
    try {
      if (id) {
        await api(`leads/${id}`, { method: 'PUT', body: JSON.stringify(dados) });
      } else {
        await api('leads', { method: 'POST', body: JSON.stringify(dados) });
      }
      await carregarLeads();
    } catch (err) {
      return toast(`Erro ao salvar: ${err.message}`);
    }
  } else {
    if (id) {
      Object.assign(leads.find((l) => l.id === id), dados);
    } else {
      leads.push({ id: `demo-${Date.now()}`, criado_em: new Date().toISOString(), ...dados });
    }
  }

  fecharModais();
  renderPipeline();
  renderMetricas();
  toast(id ? 'Lead atualizado' : 'Lead criado');
}

async function excluirLead() {
  const id = $('#f-id').value;
  if (!id || !confirm('Remover este lead?')) return;

  if (CONECTADO) {
    try {
      await api(`leads/${id}`, { method: 'DELETE' });
      await carregarLeads();
    } catch (e) {
      return toast(`Erro ao excluir: ${e.message}`);
    }
  } else {
    leads = leads.filter((l) => l.id !== id);
  }
  fecharModais();
  renderPipeline();
  renderMetricas();
  toast('Lead removido');
}

// ----- Análise IA -----
async function analisarIA() {
  $('#modal-ia').classList.add('modal-show');
  const alvo = $('#ia-conteudo');
  alvo.textContent = 'Analisando o pipeline...';

  if (CONECTADO) {
    try {
      const { dados } = await api('analise-ia', { method: 'POST', body: '{}' });
      alvo.textContent = dados.analise || 'Sem resposta.';
    } catch (e) {
      alvo.textContent = `Não foi possível obter a análise da IA: ${e.message}`;
    }
  } else {
    // Modo demo: análise heurística local (sem chamar a IA real)
    alvo.textContent = analiseLocalDemo();
  }
}

// Gera um diagnóstico simples localmente para a demo
function analiseLocalDemo() {
  const total = leads.length;
  const valorTotal = leads.reduce((s, l) => s + Number(l.valor || 0), 0);
  const porEstagio = Object.fromEntries(
    ESTAGIOS.map((e) => [e.id, leads.filter((l) => l.estagio === e.id).length]),
  );
  const fechados = porEstagio.fechado || 0;
  const conversao = total ? ((fechados / total) * 100).toFixed(1) : 0;
  const gargalo = ESTAGIOS
    .filter((e) => e.id !== 'fechado')
    .sort((a, b) => (porEstagio[b.id] || 0) - (porEstagio[a.id] || 0))[0];

  return [
    '📊 Diagnóstico geral',
    `Seu funil tem ${total} leads somando ${fmtBRL(valorTotal)} em oportunidades, com taxa de conversão de ${conversao}%.`,
    '',
    '⚠️ Pontos de atenção',
    `• Maior concentração de leads no estágio "${gargalo.titulo}" (${porEstagio[gargalo.id]} leads) — risco de gargalo.`,
    `• ${porEstagio.negociacao || 0} negócios em negociação aguardando fechamento.`,
    '',
    '✅ Ações recomendadas',
    '1. Priorize follow-up dos leads "hot" parados em proposta/negociação.',
    '2. Reaqueça os leads "cold" no topo do funil com conteúdo de valor.',
    '3. Defina meta de avanço semanal por estágio para destravar o gargalo.',
    '',
    '— (modo demo: análise gerada localmente. Conecte as Edge Functions + ANTHROPIC_API_KEY para a análise real com IA.)',
  ].join('\n');
}

// ----- Inicialização -----
function configurarEventos() {
  $('#btn-novo').addEventListener('click', () => abrirModalLead());
  $('#btn-ia').addEventListener('click', analisarIA);
  $('#btn-excluir').addEventListener('click', excluirLead);
  $('#form-lead').addEventListener('submit', salvarLead);
  document.querySelectorAll('[data-fechar]').forEach((b) =>
    b.addEventListener('click', fecharModais),
  );
  document.querySelectorAll('#modal-lead, #modal-ia').forEach((m) =>
    m.addEventListener('click', (e) => { if (e.target === m) fecharModais(); }),
  );
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharModais(); });

  // Badge de modo
  const badge = $('#badge-modo');
  if (CONECTADO) {
    badge.textContent = 'conectado';
    badge.className = 'ml-2 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700';
  }
}

async function init() {
  configurarEventos();
  await carregarLeads();
  renderPipeline();
  renderMetricas();
}

init();
