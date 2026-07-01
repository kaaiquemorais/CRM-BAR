// Shared navigation renderer

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme || 'white');
  localStorage.setItem('crm_theme', theme || 'white');
  document.querySelectorAll('.theme-dot').forEach(d => {
    d.classList.toggle('active', d.dataset.theme === (theme || 'white'));
  });
}

(function initTheme() {
  const saved = localStorage.getItem('crm_theme') || 'white';
  document.documentElement.setAttribute('data-theme', saved);
})();

function renderNav(activePage) {
  const user = AUTH.require();
  if (!user) return;

  const pages = [
    { id: 'dashboard', label: 'Dashboard', href: 'dashboard.html', icon: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>` },
    { id: 'pedidos', label: 'Pedidos', href: 'pedidos.html', icon: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="1"/><path d="M9 12h6m-6 4h4"/></svg>` },
    { id: 'estoque', label: 'Estoque', href: 'estoque.html', icon: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><path d="M16 7V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v2"/><line x1="12" y1="12" x2="12" y2="16"/><line x1="10" y1="14" x2="14" y2="14"/></svg>` },
    { id: 'contas', label: 'Contas', href: 'contas.html', icon: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>` },
    { id: 'fiados', label: 'Fiados', href: 'fiados.html', icon: `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>` },
  ];

  const products = DB.getProducts();
  const lowStock = products.filter(p => p.stock <= p.minStock).length;

  const html = `
  <aside class="sidebar">
    <a href="dashboard.html" class="sidebar-brand">
      <img src="logo.png" alt="Bar e Mercearia Godoy e Souza" style="width:110px;height:auto;display:block;margin:0 auto 4px">
    </a>
    <nav class="sidebar-nav">
      <div class="nav-section">
        <div class="nav-section-label">Menu</div>
        ${pages.map(p => `
          <a href="${p.href}" class="nav-item ${activePage === p.id ? 'active' : ''}">
            ${p.icon}
            ${p.label}
            ${p.id === 'estoque' && lowStock > 0 ? `<span class="badge">${lowStock}</span>` : ''}
          </a>
        `).join('')}
      </div>
    </nav>
    <div class="sidebar-footer">
      <div class="theme-picker">
        <span class="theme-picker-label">Tema</span>
        <span class="theme-dot theme-dot-white" data-theme="white" title="Branco" onclick="applyTheme('white')"></span>
        <span class="theme-dot theme-dot-dark"  data-theme="dark"  title="Escuro" onclick="applyTheme('dark')"></span>
        <span class="theme-dot theme-dot-pink"  data-theme="pink"  title="Rosa Choque" onclick="applyTheme('pink')"></span>
      </div>
      <div class="user-info">
        <div class="user-avatar">${(user.name || 'A')[0].toUpperCase()}</div>
        <div>
          <div class="user-name">${escHtml(user.name)}</div>
          <div class="user-role">${escHtml(user.role)}</div>
        </div>
      </div>
      <button class="logout-btn" onclick="playAndLogout()">
        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9"/>
        </svg>
        Sair
      </button>
    </div>
  </aside>`;

  document.getElementById('navContainer').innerHTML = html;
  const saved = localStorage.getItem('crm_theme') || 'white';
  document.querySelectorAll('.theme-dot').forEach(d => {
    d.classList.toggle('active', d.dataset.theme === saved);
  });
}

let _logoutAudio   = null;
let _backupFeito   = false;

function _loadXLSX(cb) {
  if (typeof XLSX !== 'undefined') { cb(); return; }
  const s = document.createElement('script');
  s.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
  s.onload  = cb;
  s.onerror = cb; // se CDN falhar, deixa sair mesmo assim
  document.head.appendChild(s);
}

function _gerarBackupExcel() {
  try {
    const d    = new Date();
    const hoje = d.toISOString().slice(0,10);
    const dFmt = `${String(d.getDate()).padStart(2,'0')}/${String(d.getMonth()+1).padStart(2,'0')}/${d.getFullYear()}`;
    const dStr = hoje;
    const wb   = XLSX.utils.book_new();

    const allOrders = JSON.parse(localStorage.getItem('crm_orders') || '[]');
    const pedHoje   = allOrders.filter(o => (o.createdAt||'').slice(0,10) === hoje);

    const orderTotal = o => (o.items||[]).reduce((s,i) => s + (parseFloat(i.price)||0) * (parseInt(i.quantity)||1), 0);

    const totalDia    = pedHoje.reduce((s,o) => s + orderTotal(o), 0);
    const totalPagos  = pedHoje.filter(o=>o.status==='pago').reduce((s,o) => s + orderTotal(o), 0);
    const totalAberto = pedHoje.filter(o=>o.status!=='pago').reduce((s,o) => s + orderTotal(o), 0);

    // ── Aba 1: Resumo do Dia ─────────────────────────────────
    const wsResumo = XLSX.utils.aoa_to_sheet([
      ['RELATÓRIO DE VENDAS DO DIA'],
      ['Data:', dFmt],
      ['Gerado às:', d.toLocaleTimeString('pt-BR')],
      [],
      ['RESUMO FINANCEIRO'],
      ['Total faturado no dia (R$)',          totalDia.toFixed(2)],
      ['Total de pedidos pagos (R$)',          totalPagos.toFixed(2)],
      ['Total de pedidos em aberto (R$)',      totalAberto.toFixed(2)],
      [],
      ['PEDIDOS'],
      ['Total de pedidos',          pedHoje.length],
      ['Pedidos pagos',             pedHoje.filter(o=>o.status==='pago').length],
      ['Pedidos em aberto',         pedHoje.filter(o=>o.status!=='pago').length],
    ]);
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo do Dia');

    // ── Aba 2: Pedidos do Dia ────────────────────────────────
    const linhasPed = [];
    pedHoje.forEach(o => {
      const tot = orderTotal(o);
      linhasPed.push([
        o.orderNumber || o.id,
        o.client || '—',
        o.status === 'pago' ? 'Pago' : 'Em aberto',
        tot.toFixed(2),
        (o.createdAt||'').slice(0,16).replace('T',' '),
      ]);
      // sub-linhas com itens do pedido
      (o.items||[]).forEach(i => {
        linhasPed.push([
          '',
          `  → ${i.name}`,
          `${i.quantity}x`,
          (parseFloat(i.price)||0).toFixed(2),
          '',
        ]);
      });
    });
    const wsPed = XLSX.utils.aoa_to_sheet([
      ['Pedido', 'Cliente / Item', 'Status / Qtd', 'Total (R$)', 'Horário'],
      ...linhasPed,
      [],
      ['', '', 'TOTAL DO DIA', totalDia.toFixed(2), ''],
    ]);
    XLSX.utils.book_append_sheet(wb, wsPed, 'Pedidos do Dia');

    // ── Aba 3: Produtos mais vendidos hoje ───────────────────
    const vendidos = {};
    pedHoje.forEach(o => {
      (o.items||[]).forEach(i => {
        if (!vendidos[i.name]) vendidos[i.name] = { qtd: 0, total: 0, cat: i.category||'' };
        vendidos[i.name].qtd   += parseInt(i.quantity)||1;
        vendidos[i.name].total += (parseFloat(i.price)||0) * (parseInt(i.quantity)||1);
      });
    });
    const rankProd = Object.entries(vendidos)
      .sort((a,b) => b[1].qtd - a[1].qtd)
      .map(([nome, v], idx) => [idx+1, nome, v.cat, v.qtd, v.total.toFixed(2)]);

    const wsProd = XLSX.utils.aoa_to_sheet([
      ['#', 'Produto', 'Categoria', 'Qtd. Vendida', 'Total (R$)'],
      ...(rankProd.length ? rankProd : [['—', 'Nenhuma venda hoje', '', 0, '0.00']]),
    ]);
    XLSX.utils.book_append_sheet(wb, wsProd, 'Produtos Vendidos');

    XLSX.writeFile(wb, `Vendas_GodoySouza_${dStr}.xlsx`);
    return true;
  } catch(e) {
    console.error('Backup error:', e);
    return false;
  }
}

function playAndLogout() {
  if (_logoutAudio) {
    _logoutAudio.pause(); _logoutAudio = null; AUTH.logout(); return;
  }

  const existing = document.getElementById('logoutModal');
  if (existing) existing.remove();
  _backupFeito = false;

  const modal = document.createElement('div');
  modal.id = 'logoutModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:1200;background:rgba(15,23,42,.55);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(3px)';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:18px;padding:32px 28px;max-width:380px;width:100%;box-shadow:0 24px 60px rgba(0,0,0,.22);font-family:inherit">

      <div style="text-align:center;margin-bottom:20px">
        <div style="width:54px;height:54px;background:#fef3c7;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:12px">
          <svg fill="none" stroke="#d97706" stroke-width="2" viewBox="0 0 24 24" width="28" height="28">
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
          </svg>
        </div>
        <h3 style="font-size:17px;font-weight:700;color:#1e293b;margin-bottom:6px">Relatório do dia</h3>
        <p style="font-size:13px;color:#64748b;line-height:1.5">Baixe o relatório de vendas antes de sair.<br>Mostra quanto dinheiro entrou hoje.</p>
      </div>

      <button id="btnBaixarBackup" style="width:100%;padding:12px;background:#6366f1;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:8px;margin-bottom:12px">
        <svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="16" height="16">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/>
        </svg>
        Baixar relatório de vendas (.xlsx)
      </button>

      <div id="backupOkMsg" style="display:none;background:#dcfce7;color:#16a34a;border-radius:8px;padding:9px 12px;font-size:13px;font-weight:600;text-align:center;margin-bottom:12px">
        ✓ Backup baixado! Agora você pode sair.
      </div>

      <div style="display:flex;gap:10px">
        <button id="logoutCancel" style="flex:1;padding:11px;background:#f1f5f9;color:#1e293b;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">
          Cancelar
        </button>
        <button id="logoutConfirm" disabled style="flex:1;padding:11px;background:#e2e8f0;color:#94a3b8;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:not-allowed;font-family:inherit">
          Sair
        </button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  document.getElementById('logoutCancel').onclick = () => modal.remove();
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  document.getElementById('btnBaixarBackup').onclick = function() {
    this.textContent = 'Gerando backup...';
    this.disabled = true;
    _loadXLSX(() => {
      const ok = _gerarBackupExcel();
      _backupFeito = true;
      document.getElementById('backupOkMsg').style.display = 'block';
      this.style.background = '#16a34a';
      this.innerHTML = `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24" width="16" height="16"><path d="M20 6 9 17l-5-5"/></svg> Backup baixado!`;
      const confirmBtn = document.getElementById('logoutConfirm');
      confirmBtn.disabled = false;
      confirmBtn.style.cssText = 'flex:1;padding:11px;background:#dc2626;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit';
    });
  };

  document.getElementById('logoutConfirm').onclick = function() {
    if (!_backupFeito) return;
    this.textContent = 'Clique novamente para sair já';
    document.getElementById('logoutCancel').style.display = 'none';
    document.getElementById('btnBaixarBackup').style.display = 'none';
    document.getElementById('backupOkMsg').style.display = 'none';

    const audio = new Audio('pai.MP3');
    _logoutAudio = audio;
    audio.play().catch(() => {});
    audio.addEventListener('ended', () => { _logoutAudio = null; AUTH.logout(); });
    audio.addEventListener('error', () => { _logoutAudio = null; AUTH.logout(); });

    this.onclick = () => { audio.pause(); _logoutAudio = null; AUTH.logout(); };
  };
}
