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

let _logoutAudio = null;

function playAndLogout() {
  // Se o áudio já estiver tocando, clicar de novo sai imediatamente
  if (_logoutAudio) {
    _logoutAudio.pause();
    _logoutAudio = null;
    AUTH.logout();
    return;
  }

  const existing = document.getElementById('logoutModal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'logoutModal';
  modal.style.cssText = 'position:fixed;inset:0;z-index:999;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(2px)';
  modal.innerHTML = `
    <div style="background:#fff;border-radius:16px;padding:32px 28px;max-width:340px;width:100%;box-shadow:0 20px 48px rgba(0,0,0,.18);text-align:center;font-family:inherit">
      <div style="width:52px;height:52px;background:#fee2e2;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px">
        <svg fill="none" stroke="#dc2626" stroke-width="2" viewBox="0 0 24 24" width="26" height="26">
          <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4m7 14 5-5-5-5m5 5H9"/>
        </svg>
      </div>
      <h3 style="font-size:17px;font-weight:700;color:#1e293b;margin-bottom:8px">Tem certeza que deseja sair?</h3>
      <p style="font-size:14px;color:#64748b;margin-bottom:24px">Você precisará entrar novamente para acessar o sistema.</p>
      <div style="display:flex;gap:10px">
        <button id="logoutCancel" style="flex:1;padding:11px;background:#f1f5f9;color:#1e293b;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">
          Cancelar
        </button>
        <button id="logoutConfirm" style="flex:1;padding:11px;background:#dc2626;color:#fff;border:none;border-radius:10px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit">
          Sim, sair
        </button>
      </div>
    </div>`;

  document.body.appendChild(modal);

  document.getElementById('logoutCancel').onclick = () => modal.remove();
  modal.addEventListener('click', e => { if (e.target === modal) modal.remove(); });

  document.getElementById('logoutConfirm').onclick = () => {
    const btn = document.getElementById('logoutConfirm');
    btn.textContent = 'Clique novamente para sair já';
    btn.disabled = false;
    document.getElementById('logoutCancel').style.display = 'none';

    const audio = new Audio('pai.MP3');
    _logoutAudio = audio;
    audio.play().catch(() => {});
    audio.addEventListener('ended', () => { _logoutAudio = null; AUTH.logout(); });
    audio.addEventListener('error', () => { _logoutAudio = null; AUTH.logout(); });

    btn.onclick = () => {
      audio.pause();
      _logoutAudio = null;
      AUTH.logout();
    };
  };
}
