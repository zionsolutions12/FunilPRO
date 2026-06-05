// ============================================================
// FunilPro — lógica principal do frontend
// Requer auth.js (Sessao, api, CONECTADO) carregado antes.
// ============================================================

const ESTAGIOS = [
  { id: 'novo',        titulo: 'Novo',        cor: '#64748b' },
  { id: 'qualificado', titulo: 'Qualificado', cor: '#3b82f6' },
  { id: 'proposta',    titulo: 'Proposta',    cor: '#8b5cf6' },
  { id: 'negociacao',  titulo: 'Negociação',  cor: '#f59e0b' },
  { id: 'fechado',     titulo: 'Fechado',     cor: '#10b981' },
];
const TEMP_LABEL = { hot: '🔥 Hot', warm: '🌤️ Warm', cold: '❄️ Cold', enterprise: '🏢 Enterprise' };
const TITULOS = {
  pipeline:      ['Pipeline', 'Visão geral do funil'],
  leads:         ['Leads', 'Todos os contatos'],
  relatorios:    ['Relatórios', 'Métricas e insights'],
  configuracoes: ['Configurações', 'Perfil e preferências'],
};

let leads = [];
let viewAtual = 'pipeline';

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
].map((l, i) => ({ id: `demo-${i + 1}`, criado_em: new Date().toISOString(), atualizado_em: new Date().toISOString(), ...l }));

// ----- Helpers -----
const $ = (s) => document.querySelector(s);
const $$ = (s) => document.querySelectorAll(s);
const fmtBRL = (v) => Number(v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
const escapar = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

function toast(msg) {
  const t = $('#toast');
  t.querySelector('div').textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2600);
}

// ============================================================
// AUTENTICAÇÃO (tela de login)
// ============================================================
let abaLogin = 'entrar';

function configurarLogin() {
  $$('.aba-login').forEach((b) => b.addEventListener('click', () => trocarAba(b.dataset.aba)));
  $('#form-login').addEventListener('submit', submeterLogin);
  $('#login-dica').textContent = CONECTADO ? '' : 'Modo demo — entre com demo@funilpro.com / demo123';
}

function trocarAba(aba) {
  abaLogin = aba;
  $('#campo-nome').classList.toggle('hidden', aba !== 'criar');
  $('#btn-entrar').textContent = aba === 'criar' ? 'Criar conta' : 'Entrar';
  $('#login-erro').classList.add('hidden');
  $$('.aba-login').forEach((b) => {
    const ativo = b.dataset.aba === aba;
    b.classList.toggle('border-indigo-600', ativo);
    b.classList.toggle('text-indigo-600', ativo);
    b.classList.toggle('border-transparent', !ativo);
    b.classList.toggle('text-slate-400', !ativo);
  });
}

async function submeterLogin(e) {
  e.preventDefault();
  const erro = $('#login-erro');
  erro.classList.add('hidden');
  const email = $('#login-email').value;
  const senha = $('#login-senha').value;
  const nome = $('#login-nome').value;
  try {
    if (abaLogin === 'criar') {
      if (!nome.trim()) throw new Error('Informe seu nome');
      await Sessao.registrar(nome, email, senha);
    } else {
      await Sessao.login(email, senha);
    }
    await entrarNoApp();
  } catch (err) {
    erro.textContent = err.message;
    erro.classList.remove('hidden');
  }
}

function mostrarLogin() {
  $('#app').style.display = 'none';
  $('#tela-login').style.display = 'flex';
}

async function entrarNoApp() {
  $('#tela-login').style.display = 'none';
  $('#app').style.display = 'flex';
  preencherUsuario();
  await carregarLeads();
  irPara('pipeline');
}

function preencherUsuario() {
  const u = Sessao.usuario || {};
  $('#user-nome').textContent = u.nome || '—';
  $('#user-papel').textContent = u.papel || '';
  $('#user-avatar').textContent = (u.nome || 'U').charAt(0).toUpperCase();
}

// ============================================================
// NAVEGAÇÃO ENTRE VIEWS
// ============================================================
function irPara(view) {
  viewAtual = view;
  $$('.view').forEach((v) => v.classList.add('hidden'));
  $(`#view-${view}`).classList.remove('hidden');
  $$('.nav-link').forEach((l) => l.classList.toggle('ativo', l.dataset.view === view));
  const [titulo, sub] = TITULOS[view];
  $('#page-titulo').textContent = titulo;
  $('#page-sub').textContent = sub;
  fecharSidebarMobile();

  if (view === 'pipeline') { renderMetricas(); renderPipeline(); }
  if (view === 'leads') renderTabelaLeads();
  if (view === 'relatorios') renderRelatorios();
  if (view === 'configuracoes') renderConfiguracoes();
}

function refreshViewAtual() {
  renderMetricas();
  irPara(viewAtual);
}

// ============================================================
// DADOS
// ============================================================
async function carregarLeads() {
  if (!CONECTADO) { leads = [...DEMO_LEADS]; return; }
  try {
    const { dados } = await api('leads');
    leads = dados || [];
  } catch (e) {
    toast(`Falha ao carregar: ${e.message} — usando demo`);
    leads = [...DEMO_LEADS];
  }
}

// ============================================================
// VIEW: PIPELINE
// ============================================================
function renderMetricas() {
  const total = leads.length;
  const valorTotal = leads.reduce((s, l) => s + Number(l.valor || 0), 0);
  const fechados = leads.filter((l) => l.estagio === 'fechado').length;
  $('#m-total').textContent = total;
  $('#m-valor').textContent = fmtBRL(valorTotal);
  $('#m-ticket').textContent = fmtBRL(total ? valorTotal / total : 0);
  $('#m-conversao').textContent = `${(total ? (fechados / total) * 100 : 0).toFixed(1)}%`;
}

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
      <div class="coluna-lista"></div>`;
    wrap.appendChild(col);
    const lista = col.querySelector('.coluna-lista');
    doEstagio.forEach((lead) => lista.appendChild(criarCard(lead)));
    col.addEventListener('dragover', (e) => { e.preventDefault(); col.classList.add('drag-over'); });
    col.addEventListener('dragleave', () => col.classList.remove('drag-over'));
    col.addEventListener('drop', (e) => {
      e.preventDefault();
      col.classList.remove('drag-over');
      moverLead(e.dataTransfer.getData('text/plain'), est.id);
    });
  });
}

function criarCard(lead) {
  const card = document.createElement('div');
  card.className = 'card';
  card.draggable = true;
  card.innerHTML = `
    <div class="flex items-start justify-between gap-2">
      <p class="font-semibold text-sm text-slate-800 leading-tight">${escapar(lead.nome)}</p>
      <span class="temp temp-${lead.temperatura}">${TEMP_LABEL[lead.temperatura] || lead.temperatura}</span>
    </div>
    <p class="text-xs text-slate-500 mt-0.5">${escapar(lead.empresa || '—')}</p>
    <div class="flex items-center justify-between mt-2.5">
      <span class="text-sm font-bold text-emerald-600">${fmtBRL(lead.valor)}</span>
      <span class="text-[11px] text-slate-400">${escapar(lead.responsavel || '')}</span>
    </div>`;
  card.addEventListener('dragstart', (e) => { e.dataTransfer.setData('text/plain', lead.id); card.classList.add('dragging'); });
  card.addEventListener('dragend', () => card.classList.remove('dragging'));
  card.addEventListener('click', () => abrirModalLead(lead));
  return card;
}

async function moverLead(id, novoEstagio) {
  const lead = leads.find((l) => String(l.id) === String(id));
  if (!lead || lead.estagio === novoEstagio) return;
  const anterior = lead.estagio;
  lead.estagio = novoEstagio;
  lead.atualizado_em = new Date().toISOString();
  refreshViewAtual();
  if (CONECTADO) {
    try {
      await api('webhook-estagio', { method: 'POST', body: JSON.stringify({ lead_id: id, estagio_novo: novoEstagio }) });
    } catch (e) {
      lead.estagio = anterior;
      refreshViewAtual();
      return toast(`Erro ao mover: ${e.message}`);
    }
  }
  toast(`${lead.nome}: ${anterior} → ${novoEstagio}`);
}

// ============================================================
// VIEW: LEADS (tabela)
// ============================================================
function renderTabelaLeads() {
  const busca = ($('#busca-leads').value || '').toLowerCase();
  const filtro = $('#filtro-estagio').value;
  const tbody = $('#tabela-leads');
  const filtrados = leads.filter((l) => {
    const txt = `${l.nome} ${l.empresa} ${l.email}`.toLowerCase();
    return (!filtro || l.estagio === filtro) && txt.includes(busca);
  });
  if (!filtrados.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="px-4 py-10 text-center text-slate-400 text-sm">Nenhum lead encontrado.</td></tr>`;
    return;
  }
  const est = (id) => ESTAGIOS.find((e) => e.id === id) || {};
  tbody.innerHTML = filtrados.map((l) => `
    <tr class="border-t border-slate-100 hover:bg-slate-50 cursor-pointer" data-id="${l.id}">
      <td class="px-4 py-3 font-medium text-slate-800">${escapar(l.nome)}</td>
      <td class="px-4 py-3 text-slate-600">${escapar(l.empresa || '—')}</td>
      <td class="px-4 py-3 text-right font-semibold text-emerald-600">${fmtBRL(l.valor)}</td>
      <td class="px-4 py-3"><span class="inline-flex items-center gap-1.5 text-xs font-medium"><span class="w-2 h-2 rounded-full" style="background:${est(l.estagio).cor}"></span>${est(l.estagio).titulo || l.estagio}</span></td>
      <td class="px-4 py-3"><span class="temp temp-${l.temperatura}">${TEMP_LABEL[l.temperatura] || l.temperatura}</span></td>
      <td class="px-4 py-3 text-slate-600">${escapar(l.responsavel || '—')}</td>
    </tr>`).join('');
  tbody.querySelectorAll('tr[data-id]').forEach((tr) =>
    tr.addEventListener('click', () => abrirModalLead(leads.find((l) => String(l.id) === tr.dataset.id))));
}

// ============================================================
// VIEW: RELATÓRIOS
// ============================================================
function renderRelatorios() {
  const total = leads.length;
  const valorTotal = leads.reduce((s, l) => s + Number(l.valor || 0), 0);
  const fechados = leads.filter((l) => l.estagio === 'fechado').length;
  const cards = [
    ['Total de Leads', total, 'text-slate-900'],
    ['Valor em Pipeline', fmtBRL(valorTotal), 'text-emerald-600'],
    ['Ticket Médio', fmtBRL(total ? valorTotal / total : 0), 'text-slate-900'],
    ['Taxa de Conversão', `${(total ? (fechados / total) * 100 : 0).toFixed(1)}%`, 'text-indigo-600'],
  ];
  $('#rel-cards').innerHTML = cards.map(([t, v, c]) => `
    <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <p class="text-xs uppercase tracking-wide text-slate-400 font-semibold">${t}</p>
      <p class="text-2xl font-bold ${c} mt-1">${v}</p>
    </div>`).join('');

  // Barras por estágio
  const maxQtd = Math.max(1, ...ESTAGIOS.map((e) => leads.filter((l) => l.estagio === e.id).length));
  $('#rel-estagios').innerHTML = ESTAGIOS.map((e) => {
    const doEst = leads.filter((l) => l.estagio === e.id);
    const valor = doEst.reduce((s, l) => s + Number(l.valor || 0), 0);
    const pct = (doEst.length / maxQtd) * 100;
    return `
      <div>
        <div class="flex justify-between text-xs mb-1">
          <span class="font-medium text-slate-700">${e.titulo}</span>
          <span class="text-slate-400">${doEst.length} • ${fmtBRL(valor)}</span>
        </div>
        <div class="h-2.5 rounded-full bg-slate-100 overflow-hidden">
          <div class="h-full rounded-full" style="width:${pct}%;background:${e.cor}"></div>
        </div>
      </div>`;
  }).join('');

  // Leads parados (>7 dias sem mudança, não fechados)
  const agora = Date.now();
  const parados = leads
    .filter((l) => l.estagio !== 'fechado')
    .map((l) => ({ ...l, dias: Math.floor((agora - new Date(l.atualizado_em || l.criado_em).getTime()) / 86400000) }))
    .filter((l) => l.dias >= 7)
    .sort((a, b) => b.dias - a.dias);
  $('#rel-parados').innerHTML = parados.length
    ? parados.map((l) => `
        <div class="flex items-center justify-between py-2.5">
          <div><p class="text-sm font-medium text-slate-800">${escapar(l.nome)}</p><p class="text-xs text-slate-400">${escapar(l.empresa || '')}</p></div>
          <span class="text-xs font-semibold text-amber-600">${l.dias} dias</span>
        </div>`).join('')
    : `<p class="py-6 text-center text-sm text-slate-400">Nenhum lead parado 🎉</p>`;
}

// ============================================================
// VIEW: CONFIGURAÇÕES
// ============================================================
function renderConfiguracoes() {
  const u = Sessao.usuario || {};
  $('#cfg-nome').value = u.nome || '';
  $('#cfg-email').value = u.email || '';
  $('#cfg-papel').value = u.papel || '';
  $('#cfg-modo').textContent = CONECTADO ? 'Conectado (Supabase)' : 'Modo demo (local)';
}

async function salvarPerfil(e) {
  e.preventDefault();
  await Sessao.salvarPerfil($('#cfg-nome').value);
  preencherUsuario();
  toast('Perfil atualizado');
}

// ============================================================
// MODAL DE LEAD
// ============================================================
function abrirModalLead(lead = null) {
  $('#modal-titulo').textContent = lead ? 'Editar Lead' : 'Novo Lead';
  $('#f-id').value = lead?.id || '';
  $('#f-nome').value = lead?.nome || '';
  $('#f-email').value = lead?.email || '';
  $('#f-telefone').value = lead?.telefone || '';
  $('#f-empresa').value = lead?.empresa || '';
  $('#f-valor').value = lead?.valor || '';
  $('#f-responsavel').value = lead?.responsavel || (lead ? '' : Sessao.usuario?.nome || '');
  $('#f-estagio').value = lead?.estagio || 'novo';
  $('#f-temperatura').value = lead?.temperatura || 'warm';
  $('#btn-excluir').classList.toggle('hidden', !lead);
  $('#modal-lead').classList.add('modal-show');
}

function fecharModais() {
  $$('.modal-show').forEach((m) => m.classList.remove('modal-show'));
}

async function salvarLead(e) {
  e.preventDefault();
  const id = $('#f-id').value;
  const dados = {
    nome: $('#f-nome').value.trim(), email: $('#f-email').value.trim(), telefone: $('#f-telefone').value.trim(),
    empresa: $('#f-empresa').value.trim(), valor: Number($('#f-valor').value || 0),
    responsavel: $('#f-responsavel').value.trim(), estagio: $('#f-estagio').value, temperatura: $('#f-temperatura').value,
  };
  if (!dados.nome) return toast('Nome é obrigatório');
  if (CONECTADO) {
    try {
      if (id) await api(`leads/${id}`, { method: 'PUT', body: JSON.stringify(dados) });
      else await api('leads', { method: 'POST', body: JSON.stringify(dados) });
      await carregarLeads();
    } catch (err) { return toast(`Erro ao salvar: ${err.message}`); }
  } else {
    if (id) Object.assign(leads.find((l) => l.id === id), dados);
    else leads.push({ id: `demo-${Date.now()}`, criado_em: new Date().toISOString(), atualizado_em: new Date().toISOString(), ...dados });
  }
  fecharModais();
  refreshViewAtual();
  toast(id ? 'Lead atualizado' : 'Lead criado');
}

async function excluirLead() {
  const id = $('#f-id').value;
  if (!id || !confirm('Remover este lead?')) return;
  if (CONECTADO) {
    try { await api(`leads/${id}`, { method: 'DELETE' }); await carregarLeads(); }
    catch (e) { return toast(`Erro ao excluir: ${e.message}`); }
  } else {
    leads = leads.filter((l) => l.id !== id);
  }
  fecharModais();
  refreshViewAtual();
  toast('Lead removido');
}

// ============================================================
// ANÁLISE IA
// ============================================================
async function analisarIA() {
  $('#modal-ia').classList.add('modal-show');
  const alvo = $('#ia-conteudo');
  alvo.textContent = 'Analisando o pipeline...';
  if (CONECTADO) {
    try { const { dados } = await api('analise-ia', { method: 'POST', body: '{}' }); alvo.textContent = dados.analise || 'Sem resposta.'; }
    catch (e) { alvo.textContent = `Não foi possível obter a análise da IA: ${e.message}`; }
  } else {
    alvo.textContent = analiseLocalDemo();
  }
}

function analiseLocalDemo() {
  const total = leads.length;
  const valorTotal = leads.reduce((s, l) => s + Number(l.valor || 0), 0);
  const porEstagio = Object.fromEntries(ESTAGIOS.map((e) => [e.id, leads.filter((l) => l.estagio === e.id).length]));
  const fechados = porEstagio.fechado || 0;
  const conversao = total ? ((fechados / total) * 100).toFixed(1) : 0;
  const gargalo = ESTAGIOS.filter((e) => e.id !== 'fechado').sort((a, b) => porEstagio[b.id] - porEstagio[a.id])[0];
  return [
    '📊 Diagnóstico geral',
    `Seu funil tem ${total} leads somando ${fmtBRL(valorTotal)} em oportunidades, com taxa de conversão de ${conversao}%.`,
    '', '⚠️ Pontos de atenção',
    `• Maior concentração no estágio "${gargalo.titulo}" (${porEstagio[gargalo.id]} leads) — risco de gargalo.`,
    `• ${porEstagio.negociacao || 0} negócios em negociação aguardando fechamento.`,
    '', '✅ Ações recomendadas',
    '1. Priorize follow-up dos leads "hot" parados em proposta/negociação.',
    '2. Reaqueça os leads "cold" no topo do funil com conteúdo de valor.',
    '3. Defina meta de avanço semanal por estágio para destravar o gargalo.',
    '', '— (modo demo: análise local. Conecte as Edge Functions + ANTHROPIC_API_KEY para a análise real com IA.)',
  ].join('\n');
}

// ============================================================
// SIDEBAR MOBILE
// ============================================================
function abrirSidebarMobile() { $('#sidebar').classList.remove('-translate-x-full'); $('#backdrop').classList.remove('hidden'); }
function fecharSidebarMobile() { if (window.innerWidth < 768) { $('#sidebar').classList.add('-translate-x-full'); $('#backdrop').classList.add('hidden'); } }

// ============================================================
// INICIALIZAÇÃO
// ============================================================
function configurarEventos() {
  $$('.nav-link').forEach((l) => { if (l.dataset.view) l.addEventListener('click', () => irPara(l.dataset.view)); });
  $('#btn-novo').addEventListener('click', () => abrirModalLead());
  $('#btn-ia').addEventListener('click', analisarIA);
  $('#btn-excluir').addEventListener('click', excluirLead);
  $('#form-lead').addEventListener('submit', salvarLead);
  $('#form-perfil').addEventListener('submit', salvarPerfil);
  $('#btn-sair').addEventListener('click', () => { Sessao.sair(); mostrarLogin(); });
  $('#busca-leads').addEventListener('input', renderTabelaLeads);
  $('#filtro-estagio').addEventListener('change', renderTabelaLeads);
  $('#btn-menu').addEventListener('click', abrirSidebarMobile);
  $('#backdrop').addEventListener('click', fecharSidebarMobile);
  $$('[data-fechar]').forEach((b) => b.addEventListener('click', fecharModais));
  $$('#modal-lead, #modal-ia').forEach((m) => m.addEventListener('click', (e) => { if (e.target === m) fecharModais(); }));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharModais(); });

  const badge = $('#badge-modo');
  if (CONECTADO) { badge.textContent = 'conectado'; badge.className = 'ml-1 text-xs font-medium px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-700'; }
}

async function init() {
  configurarLogin();
  configurarEventos();
  const usuario = await Sessao.carregar();
  if (usuario) await entrarNoApp();
  else mostrarLogin();
}

init();
