// ============================================================
// FunilPro — autenticação e sessão (frontend)
// Funciona em MODO CONECTADO (Edge Function /auth) ou MODO DEMO
// (usuários guardados no localStorage do navegador).
// ============================================================

const cfg = window.FUNILPRO_CONFIG || {};
const CONECTADO = cfg.FUNCTIONS_URL &&
  !cfg.FUNCTIONS_URL.includes('SEU-PROJETO') &&
  cfg.API_KEY && !cfg.API_KEY.includes('COLOQUE');

// Chamada genérica às Edge Functions (inclui api-key e token de sessão)
async function api(rota, opcoes = {}) {
  const resp = await fetch(`${cfg.FUNCTIONS_URL}/${rota}`, {
    ...opcoes,
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': cfg.API_KEY,
      ...(Sessao.token ? { Authorization: `Bearer ${Sessao.token}` } : {}),
      ...(opcoes.headers || {}),
    },
  });
  const json = await resp.json().catch(() => ({}));
  if (!resp.ok) throw new Error(json.erro || `Erro ${resp.status}`);
  return json;
}

// SHA-256 em hex (usado só para não guardar senha em texto no modo demo)
async function sha256(txt) {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(txt));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

const Sessao = {
  conectado: CONECTADO,
  usuario: null,
  token: null,

  // ----- Persistência local da sessão -----
  _salvar() {
    localStorage.setItem('funilpro_sessao', JSON.stringify({ usuario: this.usuario, token: this.token }));
  },
  async carregar() {
    const bruto = localStorage.getItem('funilpro_sessao');
    if (!bruto) return null;
    try {
      const { usuario, token } = JSON.parse(bruto);
      this.usuario = usuario;
      this.token = token;
      // No modo conectado, valida o token contra o backend
      if (CONECTADO && token) {
        try {
          const { dados } = await api('auth/me');
          this.usuario = dados.usuario;
          this._salvar();
        } catch {
          this.sair();
          return null;
        }
      }
      return this.usuario;
    } catch {
      return null;
    }
  },

  // ----- Login -----
  async login(email, senha) {
    email = email.toLowerCase().trim();
    if (CONECTADO) {
      const { dados } = await api('auth/login', { method: 'POST', body: JSON.stringify({ email, senha }) });
      this.usuario = dados.usuario;
      this.token = dados.token;
    } else {
      const users = this._demoUsuarios();
      const u = users.find((x) => x.email === email);
      if (!u || u.senha_hash !== (await sha256(senha))) {
        throw new Error('Email ou senha incorretos');
      }
      this.usuario = { id: u.id, nome: u.nome, email: u.email, papel: u.papel };
      this.token = 'demo-token';
    }
    this._salvar();
    return this.usuario;
  },

  // ----- Cadastro -----
  async registrar(nome, email, senha) {
    email = email.toLowerCase().trim();
    if (senha.length < 6) throw new Error('A senha deve ter ao menos 6 caracteres');
    if (CONECTADO) {
      const { dados } = await api('auth/registrar', { method: 'POST', body: JSON.stringify({ nome, email, senha }) });
      this.usuario = dados.usuario;
      this.token = dados.token;
    } else {
      const users = this._demoUsuarios();
      if (users.some((x) => x.email === email)) throw new Error('Email já cadastrado');
      const novo = { id: `u-${Date.now()}`, nome: nome.trim(), email, senha_hash: await sha256(senha), papel: 'vendedor' };
      users.push(novo);
      localStorage.setItem('funilpro_usuarios_demo', JSON.stringify(users));
      this.usuario = { id: novo.id, nome: novo.nome, email: novo.email, papel: novo.papel };
      this.token = 'demo-token';
    }
    this._salvar();
    return this.usuario;
  },

  // ----- Atualizar perfil (nome) -----
  async salvarPerfil(nome) {
    this.usuario = { ...this.usuario, nome: nome.trim() };
    if (!CONECTADO) {
      const users = this._demoUsuarios();
      const u = users.find((x) => x.id === this.usuario.id);
      if (u) { u.nome = nome.trim(); localStorage.setItem('funilpro_usuarios_demo', JSON.stringify(users)); }
    }
    this._salvar();
  },

  sair() {
    this.usuario = null;
    this.token = null;
    localStorage.removeItem('funilpro_sessao');
  },

  // Usuários do modo demo (com um usuário de exemplo pré-criado)
  _demoUsuarios() {
    const bruto = localStorage.getItem('funilpro_usuarios_demo');
    if (bruto) return JSON.parse(bruto);
    // Cria o usuário demo na primeira vez (senha: demo123)
    const inicial = [{
      id: 'u-demo', nome: 'Usuário Demo', email: 'demo@funilpro.com',
      // sha256('demo123')
      senha_hash: 'd3ad9315b7be5dd53b31a273b3b3aba5defe700808305aa16a3062b76658a791',
      papel: 'admin',
    }];
    localStorage.setItem('funilpro_usuarios_demo', JSON.stringify(inicial));
    return inicial;
  },
};

window.Sessao = Sessao;
window.api = api;
window.CONECTADO = CONECTADO;
