// Re-authentication overlay — injected into protected pages (dashboard, estoque)
// Sempre pede senha ao acessar, sem cache ou TTL

const REAUTH = {
  isValid() { return false; },
  grant() {},

  require(pageName) {
    if (!AUTH.require()) return;

    // Inject overlay
    const overlay = document.createElement('div');
    overlay.id = 'reauthOverlay';
    overlay.style.cssText = [
      'position:fixed','inset:0','background:rgba(241,245,249,.97)',
      'z-index:999','display:flex','align-items:center','justify-content:center',
      'font-family:Inter,-apple-system,BlinkMacSystemFont,sans-serif'
    ].join(';');

    overlay.innerHTML = `
      <div style="background:#fff;border-radius:16px;padding:40px 36px;width:100%;max-width:380px;box-shadow:0 20px 40px rgba(0,0,0,.12);border:1px solid #e2e8f0;text-align:center">
        <div style="width:52px;height:52px;background:#e0e7ff;border-radius:14px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px">
          <svg fill="none" stroke="#6366f1" stroke-width="2" viewBox="0 0 24 24" width="26" height="26">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
            <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
          </svg>
        </div>
        <h2 style="font-size:18px;font-weight:700;color:#1e293b;margin-bottom:6px">Confirmar Acesso</h2>
        <p style="font-size:13px;color:#64748b;margin-bottom:24px">Para acessar <strong>${pageName}</strong>, confirme sua senha.</p>
        <div id="reauthError" style="background:#fee2e2;color:#dc2626;border-radius:8px;padding:10px;font-size:13px;margin-bottom:14px;display:none"></div>
        <input type="password" id="reauthPass" placeholder="Sua senha" autocomplete="current-password"
          style="width:100%;padding:11px 14px;border:1.5px solid #e2e8f0;border-radius:8px;font-size:14px;outline:none;font-family:inherit;margin-bottom:14px;box-sizing:border-box"
          onkeydown="if(event.key==='Enter')REAUTH.check()">
        <button onclick="REAUTH.check()" style="width:100%;padding:12px;background:#6366f1;color:#fff;border:none;border-radius:8px;font-size:15px;font-weight:600;cursor:pointer;font-family:inherit">
          Confirmar
        </button>
        <div style="margin-top:14px">
          <a href="pedidos.html" style="font-size:13px;color:#6366f1;text-decoration:none">← Ir para Pedidos</a>
        </div>
      </div>`;

    document.body.appendChild(overlay);
    setTimeout(() => document.getElementById('reauthPass')?.focus(), 100);

    // Style the input on focus
    const inp = overlay.querySelector('input');
    inp.addEventListener('focus', () => inp.style.borderColor = '#6366f1');
    inp.addEventListener('blur', () => inp.style.borderColor = '#e2e8f0');
  },

  check() {
    const pass = document.getElementById('reauthPass')?.value || '';
    const user = AUTH.getUser();
    const valid = AUTH.USERS.some(u => u.login === user?.login && u.password === pass);
    if (valid) {
      this.grant();
      const el = document.getElementById('reauthOverlay');
      if (el) { el.style.opacity = '0'; el.style.transition = 'opacity .2s'; setTimeout(() => el.remove(), 200); }
    } else {
      const err = document.getElementById('reauthError');
      if (err) { err.textContent = 'Senha incorreta. Tente novamente.'; err.style.display = 'block'; }
      if (document.getElementById('reauthPass')) document.getElementById('reauthPass').value = '';
    }
  }
};
