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
  dashboard:     ['Dashboard', 'Visão geral em tempo real'],
  pipeline:      ['Pipeline', 'Visão geral do funil'],
  leads:         ['Leads', 'Todos os contatos'],
  relatorios:    ['Relatórios', 'Métricas e insights'],
  configuracoes: ['Configurações', 'Perfil e preferências'],
};

let leads = [];
let viewAtual = 'dashboard';
let charts = {};          // instâncias do Chart.js
let realtimeClient = null;
let pollTimer = null;

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
  // ----- Leads adicionais (datas espalhadas para o gráfico de faturamento) -----
  { nome: 'Carlos Eduardo Pinto', empresa: 'Pinto Advocacia',        valor: 8500,  estagio: 'qualificado', temperatura: 'warm',       responsavel: 'Ana Paula',     email: 'carlos@pintoadv.com.br',        telefone: '(11) 98111-2233', criado_em: '2026-01-08T10:00:00Z' },
  { nome: 'Sandra Regina Alves',  empresa: 'Alves Contabilidade',    valor: 6200,  estagio: 'fechado',     temperatura: 'warm',       responsavel: 'Carlos Mendes', email: 'sandra@alvescont.com.br',       telefone: '(21) 98222-3344', criado_em: '2026-01-14T10:00:00Z' },
  { nome: 'Marcos Vinícius Dias', empresa: 'Dias Tecnologia',        valor: 22000, estagio: 'negociacao',  temperatura: 'hot',        responsavel: 'Ana Paula',     email: 'marcos@diastech.com.br',        telefone: '(31) 98333-4455', criado_em: '2026-01-21T10:00:00Z' },
  { nome: 'Aline Cristina Ramos', empresa: 'Studio Aline',           valor: 3500,  estagio: 'novo',        temperatura: 'cold',       responsavel: 'Carlos Mendes', email: 'aline@studioaline.com',         telefone: '(41) 98444-5566', criado_em: '2026-01-27T10:00:00Z' },
  { nome: 'Paulo Henrique Cruz',  empresa: 'Cruz Logística',         valor: 14000, estagio: 'proposta',    temperatura: 'hot',        responsavel: 'Ana Paula',     email: 'paulo@cruzlog.com.br',          telefone: '(51) 98555-6677', criado_em: '2026-02-04T10:00:00Z' },
  { nome: 'Vanessa Lima',         empresa: 'Boutique Vanessa',       valor: 4100,  estagio: 'fechado',     temperatura: 'warm',       responsavel: 'Carlos Mendes', email: 'vanessa@boutiquevanessa.com',   telefone: '(11) 98666-7788', criado_em: '2026-02-10T10:00:00Z' },
  { nome: 'Roberto Carlos Mota',  empresa: 'Mota Imóveis',           valor: 17500, estagio: 'qualificado', temperatura: 'hot',        responsavel: 'Ana Paula',     email: 'roberto@motaimoveis.com.br',    telefone: '(62) 98777-8899', criado_em: '2026-02-17T10:00:00Z' },
  { nome: 'Débora Santos',        empresa: 'Clínica Débora',         valor: 9800,  estagio: 'proposta',    temperatura: 'warm',       responsavel: 'Carlos Mendes', email: 'debora@clinicadebora.com.br',   telefone: '(85) 98888-9900', criado_em: '2026-02-25T10:00:00Z' },
  { nome: 'Felipe Andrade',       empresa: 'Andrade Esportes',       valor: 5400,  estagio: 'novo',        temperatura: 'warm',       responsavel: 'Ana Paula',     email: 'felipe@andradeesportes.com',    telefone: '(48) 98999-0011', criado_em: '2026-03-03T10:00:00Z' },
  { nome: 'Tatiane Moreira',      empresa: 'Moreira Cosméticos',     valor: 7600,  estagio: 'qualificado', temperatura: 'cold',       responsavel: 'Carlos Mendes', email: 'tatiane@moreiracosm.com.br',    telefone: '(19) 98010-1122', criado_em: '2026-03-11T10:00:00Z' },
  { nome: 'Ricardo Nunes',        empresa: 'Nunes Engenharia',       valor: 28000, estagio: 'negociacao',  temperatura: 'enterprise', responsavel: 'Ana Paula',     email: 'ricardo@nuneseng.com.br',       telefone: '(54) 98121-2233', criado_em: '2026-03-18T10:00:00Z' },
  { nome: 'Cláudia Barbosa',      empresa: 'Barbosa Eventos',        valor: 11500, estagio: 'fechado',     temperatura: 'hot',        responsavel: 'Carlos Mendes', email: 'claudia@barbosaeventos.com.br', telefone: '(81) 98232-3344', criado_em: '2026-03-26T10:00:00Z' },
  { nome: 'Anderson Teixeira',    empresa: 'Teixeira Auto Center',   valor: 8200,  estagio: 'proposta',    temperatura: 'warm',       responsavel: 'Ana Paula',     email: 'anderson@teixeiraauto.com.br',  telefone: '(11) 98343-4455', criado_em: '2026-04-02T10:00:00Z' },
  { nome: 'Priscila Fernandes',   empresa: 'Fernandes Moda',         valor: 6700,  estagio: 'qualificado', temperatura: 'warm',       responsavel: 'Carlos Mendes', email: 'priscila@fernandesmoda.com.br', telefone: '(21) 98454-5566', criado_em: '2026-04-09T10:00:00Z' },
  { nome: 'Leonardo Castro',      empresa: 'Castro Consultoria',     valor: 19000, estagio: 'negociacao',  temperatura: 'enterprise', responsavel: 'Ana Paula',     email: 'leonardo@castroconsult.com.br', telefone: '(31) 98565-6677', criado_em: '2026-04-16T10:00:00Z' },
  { nome: 'Renata Cardoso',       empresa: 'Cardoso Decorações',     valor: 9300,  estagio: 'novo',        temperatura: 'hot',        responsavel: 'Carlos Mendes', email: 'renata@cardosodecor.com.br',    telefone: '(41) 98676-7788', criado_em: '2026-04-23T10:00:00Z' },
  { nome: 'Gabriel Monteiro',     empresa: 'Monteiro Distribuidora', valor: 24500, estagio: 'fechado',     temperatura: 'enterprise', responsavel: 'Ana Paula',     email: 'gabriel@monteirodist.com.br',   telefone: '(51) 98787-8899', criado_em: '2026-05-05T10:00:00Z' },
  { nome: 'Juliana Pires',        empresa: 'Pires Odontologia',      valor: 7100,  estagio: 'proposta',    temperatura: 'warm',       responsavel: 'Carlos Mendes', email: 'juliana@piresodonto.com.br',    telefone: '(62) 98898-9900', criado_em: '2026-05-13T10:00:00Z' },
  { nome: 'Fábio Rocha',          empresa: 'Rocha Construções',      valor: 16800, estagio: 'negociacao',  temperatura: 'hot',        responsavel: 'Ana Paula',     email: 'fabio@rochaconstrucoes.com.br', telefone: '(85) 98909-0011', criado_em: '2026-05-20T10:00:00Z' },
  { nome: 'Simone Azevedo',       empresa: 'Azevedo Joias',          valor: 13200, estagio: 'qualificado', temperatura: 'hot',        responsavel: 'Carlos Mendes', email: 'simone@azevedojoias.com.br',    telefone: '(48) 98011-1213', criado_em: '2026-05-28T10:00:00Z' },
  { nome: 'Diego Martins',        empresa: 'Martins Fitness',        valor: 5900,  estagio: 'novo',        temperatura: 'warm',       responsavel: 'Ana Paula',     email: 'diego@martinsfitness.com.br',   telefone: '(19) 98122-1314', criado_em: '2026-06-02T10:00:00Z' },
  { nome: 'Camila Borges',        empresa: 'Borges Pet',             valor: 4600,  estagio: 'fechado',     temperatura: 'cold',       responsavel: 'Carlos Mendes', email: 'camila@borgespet.com.br',       telefone: '(54) 98233-1415', criado_em: '2026-06-04T10:00:00Z' },
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
  irPara('dashboard');
  iniciarTempoReal();
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

  if (view === 'dashboard') renderDashboard();
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
// VIEW: DASHBOARD
// ============================================================
const TEMP_CORES = { hot: '#ef4444', warm: '#f59e0b', cold: '#3b82f6', enterprise: '#8b5cf6' };

function renderDashboard() {
  const total = leads.length;
  const valorPipeline = leads.reduce((s, l) => s + Number(l.valor || 0), 0);
  const fechadosArr = leads.filter((l) => l.estagio === 'fechado');
  const valorFechado = fechadosArr.reduce((s, l) => s + Number(l.valor || 0), 0);
  const ticket = fechadosArr.length ? valorFechado / fechadosArr.length : 0;
  const conversao = total ? (fechadosArr.length / total) * 100 : 0;

  const kpis = [
    ['Total de Leads', String(total), '👥', 'text-slate-900'],
    ['Em Pipeline', fmtBRL(valorPipeline), '💰', 'text-emerald-600'],
    ['Valor Fechado', fmtBRL(valorFechado), '✅', 'text-emerald-700'],
    ['Conversão', `${conversao.toFixed(1)}%`, '📈', 'text-indigo-600'],
    ['Ticket Médio', fmtBRL(ticket), '🎯', 'text-slate-900'],
  ];
  $('#dash-kpis').innerHTML = kpis.map(([t, v, ic, c]) => `
    <div class="bg-white rounded-xl border border-slate-200 p-4 shadow-sm">
      <div class="flex items-center justify-between">
        <p class="text-xs uppercase tracking-wide text-slate-400 font-semibold">${t}</p><span>${ic}</span>
      </div>
      <p class="text-2xl font-bold ${c} mt-1">${v}</p>
    </div>`).join('');

  renderGraficos();
  renderTopVendas();
  renderRanking();
}

function makeChart(id, config) {
  if (typeof Chart === 'undefined') return;
  const el = $(`#${id}`);
  if (!el) return;
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(el, config);
}

const MESES_ABREV = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];

function renderGraficos() {
  // Barras: valor por estágio
  const valores = ESTAGIOS.map((e) => leads.filter((l) => l.estagio === e.id).reduce((s, l) => s + Number(l.valor || 0), 0));
  makeChart('chart-estagios', {
    type: 'bar',
    data: { labels: ESTAGIOS.map((e) => e.titulo), datasets: [{ data: valores, backgroundColor: ESTAGIOS.map((e) => e.cor), borderRadius: 6 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => fmtBRL(c.parsed.y) } } },
      scales: { y: { ticks: { callback: (v) => 'R$ ' + (v / 1000) + 'k' } } },
    },
  });
  // Rosca: leads por temperatura
  const temps = ['hot', 'warm', 'cold', 'enterprise'];
  makeChart('chart-temp', {
    type: 'doughnut',
    data: { labels: ['Hot', 'Warm', 'Cold', 'Enterprise'], datasets: [{ data: temps.map((t) => leads.filter((l) => l.temperatura === t).length), backgroundColor: temps.map((t) => TEMP_CORES[t]) }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '60%', plugins: { legend: { position: 'bottom' } } },
  });
  // Linha: faturamento por mês
  renderFaturamento();
}

function renderFaturamento() {
  // Soma o valor dos leads agrupado por mês de criação
  const porMes = {};
  leads.forEach((l) => {
    const d = new Date(l.criado_em || Date.now());
    if (isNaN(d.getTime())) return;
    const chave = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    porMes[chave] = (porMes[chave] || 0) + Number(l.valor || 0);
  });
  const meses = Object.keys(porMes).sort();
  const labels = meses.map((m) => { const [a, mm] = m.split('-'); return `${MESES_ABREV[Number(mm) - 1]}/${a.slice(2)}`; });
  const valores = meses.map((m) => porMes[m]);
  makeChart('chart-faturamento', {
    type: 'line',
    data: { labels, datasets: [{ label: 'Faturamento', data: valores, borderColor: '#6366f1', backgroundColor: 'rgba(99,102,241,0.12)', fill: true, tension: 0.35, pointBackgroundColor: '#6366f1', pointRadius: 4 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (c) => fmtBRL(c.parsed.y) } } },
      scales: { y: { ticks: { callback: (v) => 'R$ ' + (v / 1000) + 'k' } } },
    },
  });
}

function renderTopVendas() {
  const top = [...leads].sort((a, b) => Number(b.valor || 0) - Number(a.valor || 0)).slice(0, 5);
  const est = (id) => ESTAGIOS.find((e) => e.id === id) || {};
  $('#dash-top').innerHTML = top.map((l, i) => `
    <div class="flex items-center gap-3 py-1.5">
      <span class="w-6 h-6 rounded-full bg-slate-100 text-slate-500 text-xs font-bold flex items-center justify-center">${i + 1}</span>
      <div class="min-w-0 flex-1">
        <p class="text-sm font-medium text-slate-800 truncate">${escapar(l.nome)}</p>
        <p class="text-xs text-slate-400 truncate">${escapar(l.empresa || '—')} · <span style="color:${est(l.estagio).cor}">${est(l.estagio).titulo || l.estagio}</span></p>
      </div>
      <span class="text-sm font-bold text-emerald-600">${fmtBRL(l.valor)}</span>
    </div>`).join('') || '<p class="text-sm text-slate-400">Sem dados.</p>';
}

function renderRanking() {
  const mapa = {};
  leads.forEach((l) => { const r = l.responsavel || '—'; mapa[r] = (mapa[r] || 0) + Number(l.valor || 0); });
  const rank = Object.entries(mapa).sort((a, b) => b[1] - a[1]);
  const max = Math.max(1, ...rank.map((r) => r[1]));
  $('#dash-ranking').innerHTML = rank.map(([nome, val]) => `
    <div>
      <div class="flex justify-between text-xs mb-1"><span class="font-medium text-slate-700">${escapar(nome)}</span><span class="text-slate-400">${fmtBRL(val)}</span></div>
      <div class="h-2.5 rounded-full bg-slate-100 overflow-hidden"><div class="h-full rounded-full bg-gradient-to-r from-indigo-500 to-violet-500" style="width:${(val / max) * 100}%"></div></div>
    </div>`).join('') || '<p class="text-sm text-slate-400">Sem dados.</p>';
}

// ----- Tempo real -----
async function refreshDados() {
  if (CONECTADO) { try { await carregarLeads(); } catch { /* mantém dados atuais */ } }
  renderMetricas();
  irPara(viewAtual);
  marcarAoVivo();
}

function marcarAoVivo() {
  const el = $('#dash-live');
  if (!el) return;
  const hora = new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  el.innerHTML = `<span class="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span> ao vivo · ${hora}`;
  el.className = 'inline-flex items-center gap-1.5 text-xs font-medium text-emerald-600';
}

function iniciarTempoReal() {
  if (!CONECTADO) return; // em modo demo não há fonte externa de mudanças
  try {
    if (typeof supabase !== 'undefined' && cfg.SUPABASE_URL && cfg.SUPABASE_PUBLISHABLE_KEY && !cfg.SUPABASE_URL.includes('SEU-PROJETO')) {
      realtimeClient = supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_PUBLISHABLE_KEY);
      realtimeClient.channel('funilpro-leads')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'leads' }, () => refreshDados())
        .subscribe();
      marcarAoVivo();
    }
  } catch (e) { /* cai no polling */ }
  if (pollTimer) clearInterval(pollTimer);
  pollTimer = setInterval(refreshDados, 8000); // fallback
}

function pararTempoReal() {
  if (pollTimer) { clearInterval(pollTimer); pollTimer = null; }
  if (realtimeClient) { try { realtimeClient.removeAllChannels(); } catch (e) { /* ok */ } realtimeClient = null; }
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
// ANÁLISE IA (chama a Edge Function analise-ia, render estruturado)
// ============================================================
async function analisarIA() {
  if (viewAtual !== 'dashboard') irPara('dashboard');
  const alvo = $('#ia-resultado');
  $('#btn-analisar').disabled = true;
  alvo.innerHTML = '<p class="text-sm text-slate-400 py-8 text-center">Analisando o funil com IA… ⏳</p>';
  try {
    let analise;
    if (CONECTADO) {
      const { dados } = await api('analise-ia', { method: 'POST', body: '{}' });
      analise = dados.analise;
    } else {
      await new Promise((r) => setTimeout(r, 700)); // simula a latência da IA
      analise = analiseDemoEstruturada();
    }
    renderAnaliseIA(analise);
    if (!CONECTADO) {
      alvo.insertAdjacentHTML('beforeend', '<p class="text-xs text-slate-400 mt-4 text-center">— modo demo: análise gerada localmente. Conecte as Edge Functions para a análise real com IA.</p>');
    }
  } catch (e) {
    alvo.innerHTML = `<p class="text-sm text-red-600 py-6 text-center">Não foi possível obter a análise: ${escapar(e.message)}</p>`;
  } finally {
    $('#btn-analisar').disabled = false;
  }
}

function renderAnaliseIA(a) {
  if (!a) { $('#ia-resultado').innerHTML = '<p class="text-sm text-slate-400 py-6 text-center">Sem análise.</p>'; return; }
  const prioCor = { alta: 'bg-red-100 text-red-700', media: 'bg-amber-100 text-amber-700', baixa: 'bg-slate-100 text-slate-600' };
  const confCor = { alta: 'text-emerald-700', media: 'text-amber-600', baixa: 'text-red-600' };

  const urgentes = (a.leads_urgentes || []).map((l) => `
    <div class="rounded-lg border border-red-200 bg-red-50 p-3">
      <div class="flex items-start justify-between gap-2">
        <p class="font-semibold text-sm text-slate-800">${escapar(l.lead)}${l.empresa ? ` <span class="font-normal text-slate-500">· ${escapar(l.empresa)}</span>` : ''}</p>
        <span class="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded ${prioCor[l.prioridade] || prioCor.baixa}">${escapar(l.prioridade || '')}</span>
      </div>
      <p class="text-xs text-slate-600 mt-1">${escapar(l.motivo || '')}</p>
      ${l.acao_recomendada ? `<p class="text-xs text-red-700 mt-1.5">▶ ${escapar(l.acao_recomendada)}</p>` : ''}
    </div>`).join('') || '<p class="text-sm text-slate-400">Nenhum lead urgente. 🎉</p>';

  const gargalos = (a.gargalos || []).map((g) => `
    <div class="rounded-lg border border-amber-200 bg-amber-50 p-3">
      <p class="font-semibold text-sm text-amber-800">${escapar(g.estagio || '')}</p>
      <p class="text-xs text-slate-600 mt-1">${escapar(g.descricao || '')}</p>
      ${g.impacto ? `<p class="text-xs text-amber-700 mt-1">Impacto: ${escapar(g.impacto)}</p>` : ''}
    </div>`).join('') || '<p class="text-sm text-slate-400">Sem gargalos relevantes.</p>';

  const p = a.previsao_faturamento || {};
  const recs = (a.recomendacoes || []).map((r, i) => `
    <div class="rounded-lg border border-slate-200 bg-white p-3 flex gap-2.5 items-start">
      <span class="w-6 h-6 flex-shrink-0 rounded-full bg-indigo-100 text-indigo-700 text-xs font-bold flex items-center justify-center">${i + 1}</span>
      <p class="text-xs text-slate-700 leading-relaxed">${escapar(String(r).replace(/^\d+\.\s*/, ''))}</p>
    </div>`).join('');

  $('#ia-resultado').innerHTML = `
    <p class="text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-lg p-3 mb-4">${escapar(a.resumo_executivo || '')}</p>
    <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-5">
      <div class="lg:col-span-2">
        <h4 class="font-bold text-red-700 text-sm mb-2">🚨 Alertas — leads urgentes</h4>
        <div class="space-y-2 max-h-80 overflow-y-auto pr-1">${urgentes}</div>
      </div>
      <div class="space-y-4">
        <div>
          <h4 class="font-bold text-emerald-700 text-sm mb-2">💰 Previsão de faturamento</h4>
          <div class="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
            <p class="text-2xl font-bold text-emerald-700">${fmtBRL(p.valor_estimado || 0)}</p>
            <p class="text-xs text-emerald-600 mt-0.5">${escapar(p.periodo || '')} · confiança <span class="font-semibold ${confCor[p.confianca] || ''}">${escapar(p.confianca || '—')}</span></p>
            ${p.justificativa ? `<p class="text-xs text-slate-600 mt-2 leading-relaxed">${escapar(p.justificativa)}</p>` : ''}
          </div>
        </div>
        <div>
          <h4 class="font-bold text-amber-700 text-sm mb-2">🚧 Gargalos</h4>
          <div class="space-y-2 max-h-64 overflow-y-auto pr-1">${gargalos}</div>
        </div>
      </div>
    </div>
    <h4 class="font-bold text-slate-800 text-sm mb-2">✅ Ações recomendadas</h4>
    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2">${recs}</div>`;
}

// Análise estruturada local (modo demo) — mesmo formato da Edge Function
function analiseDemoEstruturada() {
  const total = leads.length;
  const valorTotal = leads.reduce((s, l) => s + Number(l.valor || 0), 0);
  const fechados = leads.filter((l) => l.estagio === 'fechado');
  const conversao = total ? (fechados.length / total) * 100 : 0;

  const urgentes = leads
    .filter((l) => ['negociacao', 'proposta'].includes(l.estagio) && ['hot', 'enterprise'].includes(l.temperatura))
    .sort((a, b) => Number(b.valor || 0) - Number(a.valor || 0))
    .slice(0, 6)
    .map((l) => ({
      lead: l.nome,
      empresa: l.empresa,
      motivo: `Lead ${l.temperatura} de ${fmtBRL(l.valor)} em ${l.estagio} — alto valor, priorize o follow-up.`,
      acao_recomendada: 'Contato imediato para destravar e definir o próximo passo com prazo.',
      prioridade: Number(l.valor || 0) >= 12000 ? 'alta' : 'media',
    }));

  const cont = {};
  leads.forEach((l) => { if (l.estagio !== 'fechado') cont[l.estagio] = (cont[l.estagio] || 0) + 1; });
  const garg = Object.entries(cont).sort((a, b) => b[1] - a[1])[0];
  const tituloEst = (id) => (ESTAGIOS.find((e) => e.id === id) || {}).titulo || id;
  const gargalos = garg
    ? [{ estagio: tituloEst(garg[0]), descricao: `${garg[1]} leads acumulados neste estágio sem avançar.`, impacto: 'Receita represada e risco de esfriamento dos leads.' }]
    : [];

  const valNeg = leads.filter((l) => l.estagio === 'negociacao').reduce((s, l) => s + Number(l.valor || 0), 0);
  const valProp = leads.filter((l) => l.estagio === 'proposta').reduce((s, l) => s + Number(l.valor || 0), 0);

  return {
    resumo_executivo: `Funil com ${total} leads e ${fmtBRL(valorTotal)} em pipeline, conversão de ${conversao.toFixed(1)}%. Há oportunidades quentes que precisam de ação para não esfriar.`,
    leads_urgentes: urgentes,
    gargalos,
    previsao_faturamento: {
      valor_estimado: Math.round(valNeg * 0.35 + valProp * 0.2),
      periodo: 'próximos 30 dias',
      confianca: 'media',
      justificativa: '35% sobre o valor em negociação + 20% sobre as propostas em aberto.',
    },
    recomendacoes: [
      'Priorizar follow-up dos leads quentes em negociação e proposta.',
      'Criar um SLA: nenhum lead parado por mais de 3 dias em negociação.',
      'Reaquecer os leads "cold" no topo do funil com conteúdo de valor.',
      'Avançar os qualificados de alto valor para proposta em até 48h.',
    ],
  };
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
  $('#btn-analisar').addEventListener('click', analisarIA);
  $('#btn-excluir').addEventListener('click', excluirLead);
  $('#form-lead').addEventListener('submit', salvarLead);
  $('#form-perfil').addEventListener('submit', salvarPerfil);
  $('#btn-sair').addEventListener('click', () => { pararTempoReal(); Sessao.sair(); mostrarLogin(); });
  $('#busca-leads').addEventListener('input', renderTabelaLeads);
  $('#filtro-estagio').addEventListener('change', renderTabelaLeads);
  $('#btn-menu').addEventListener('click', abrirSidebarMobile);
  $('#backdrop').addEventListener('click', fecharSidebarMobile);
  $$('[data-fechar]').forEach((b) => b.addEventListener('click', fecharModais));
  $$('#modal-lead, #modal-ia').forEach((m) => m.addEventListener('click', (e) => { if (e.target === m) fecharModais(); }));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') fecharModais(); });
  window.addEventListener('resize', () => { Object.values(charts).forEach((c) => { try { c.resize(); } catch (e) { /* ok */ } }); });

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
