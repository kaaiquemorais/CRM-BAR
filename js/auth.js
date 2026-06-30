// Auth utilities
const AUTH = {
  USERS: [{ login: 'admin', password: 'admin', name: 'Administrador', role: 'Admin' }],
  KEY: 'crm_session',

  login(login, password) {
    const user = this.USERS.find(u => u.login === login && u.password === password);
    if (!user) return false;
    sessionStorage.setItem(this.KEY, JSON.stringify({ login: user.login, name: user.name, role: user.role }));
    return true;
  },
  logout() {
    sessionStorage.removeItem(this.KEY);
    location.href = 'login.html';
  },
  getUser() {
    try { return JSON.parse(sessionStorage.getItem(this.KEY) || 'null') } catch { return null }
  },
  require() {
    if (!this.getUser()) { location.href = 'login.html'; return null; }
    return this.getUser();
  }
};
