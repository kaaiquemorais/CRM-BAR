// CRM Data Layer — all persistence via localStorage

// Strip HTML tags and limit string length before storing any user input
function sanitize(val, maxLen = 200) {
  if (val === null || val === undefined) return '';
  return String(val)
    .replace(/<[^>]*>/g, '')   // remove HTML tags
    .replace(/javascript:/gi, '')
    .replace(/on\w+\s*=/gi, '')
    .trim()
    .slice(0, maxLen);
}

const DB = {
  // ---- keys ----
  KEYS: { products: 'crm_products', orders: 'crm_orders', movements: 'crm_movements', nextId: 'crm_nextid' },

  // ---- generic ----
  _get(k) { try { return JSON.parse(localStorage.getItem(k) || 'null') } catch { return null } },
  _set(k, v) { localStorage.setItem(k, JSON.stringify(v)) },
  nextId() { const n = (this._get(this.KEYS.nextId) || 1000) + 1; this._set(this.KEYS.nextId, n); return n },

  // ---- PRODUCTS ----
  getProducts() { return this._get(this.KEYS.products) || [] },
  saveProducts(arr) { this._set(this.KEYS.products, arr) },
  addProduct(p) {
    const arr = this.getProducts();
    p.id = this.nextId();
    p.createdAt = new Date().toISOString();
    p.name     = sanitize(p.name, 100);
    p.category = sanitize(p.category, 60);
    p.emoji    = sanitize(p.emoji, 8);
    p.unit     = sanitize(p.unit, 20);
    arr.push(p);
    this.saveProducts(arr);
    return p;
  },
  updateProduct(id, data) {
    if (data.name     !== undefined) data.name     = sanitize(data.name, 100);
    if (data.category !== undefined) data.category = sanitize(data.category, 60);
    if (data.emoji    !== undefined) data.emoji    = sanitize(data.emoji, 8);
    if (data.unit     !== undefined) data.unit     = sanitize(data.unit, 20);
    const arr = this.getProducts().map(p => p.id === id ? { ...p, ...data, id } : p);
    this.saveProducts(arr);
  },
  deleteProduct(id) { this.saveProducts(this.getProducts().filter(p => p.id !== id)) },
  getProduct(id) { return this.getProducts().find(p => p.id === id) },

  adjustStock(productId, delta, type, reason) {
    const arr = this.getProducts();
    const p = arr.find(x => x.id === productId);
    if (!p) return;
    p.stock = Math.max(0, p.stock + delta);
    this.saveProducts(arr);
    this.addMovement({ productId, productName: p.name, type, quantity: Math.abs(delta), reason });
  },

  // ---- ORDERS ----
  getOrders() { return this._get(this.KEYS.orders) || [] },
  saveOrders(arr) { this._set(this.KEYS.orders, arr) },
  addOrder(o) {
    const arr = this.getOrders();
    o.id = this.nextId();
    const num = String(arr.length + 1).padStart(4, '0');
    o.orderNumber = `PED-${num}`;
    o.createdAt = new Date().toISOString();
    o.status = o.status || 'aberto';
    o.client = sanitize(o.client, 80);
    arr.push(o);
    this.saveOrders(arr);
    // deduct stock immediately (items are being served)
    (o.items || []).forEach(item => {
      this.adjustStock(item.productId, -item.quantity, 'saida', `Pedido ${o.orderNumber}`);
    });
    return o;
  },
  finalizeOrder(id) {
    const arr = this.getOrders().map(o => o.id === id ? { ...o, status: 'pago', updatedAt: new Date().toISOString() } : o);
    this.saveOrders(arr);
  },
  addItemToOrder(orderId, item) {
    const arr = this.getOrders();
    const order = arr.find(o => o.id === orderId);
    if (!order) return null;
    const existing = order.items.find(i => i.productId === item.productId);
    if (existing) {
      existing.quantity += item.quantity;
    } else {
      order.items.push({ ...item });
    }
    order.total = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
    order.updatedAt = new Date().toISOString();
    this.saveOrders(arr);
    this.adjustStock(item.productId, -item.quantity, 'saida', `Pedido ${order.orderNumber}`);
    return order;
  },
  removeItemFromOrder(orderId, productId) {
    const arr = this.getOrders();
    const order = arr.find(o => o.id === orderId);
    if (!order) return;
    const item = order.items.find(i => i.productId === productId);
    if (!item) return;
    this.adjustStock(productId, item.quantity, 'entrada', `Remoção do pedido ${order.orderNumber}`);
    order.items = order.items.filter(i => i.productId !== productId);
    order.total = order.items.reduce((s, i) => s + i.price * i.quantity, 0);
    order.updatedAt = new Date().toISOString();
    this.saveOrders(arr);
  },
  updateOrderStatus(id, status) {
    const arr = this.getOrders().map(o => o.id === id ? { ...o, status, updatedAt: new Date().toISOString() } : o);
    this.saveOrders(arr);
  },
  deleteOrder(id) { this.saveOrders(this.getOrders().filter(o => o.id !== id)) },

  // ---- MOVEMENTS ----
  getMovements() { return this._get(this.KEYS.movements) || [] },
  addMovement(m) {
    const arr = this.getMovements();
    m.id = this.nextId();
    m.date = new Date().toISOString();
    arr.unshift(m);
    if (arr.length > 500) arr.splice(500);
    this._set(this.KEYS.movements, arr);
  },

  // ---- STATS ----
  getStats() {
    const orders = this.getOrders().filter(o => o.status !== 'cancelado');
    const products = this.getProducts();
    const now = new Date();
    const thisMonth = now.getMonth();
    const thisYear = now.getFullYear();

    const monthOrders = orders.filter(o => {
      const d = new Date(o.createdAt);
      return d.getMonth() === thisMonth && d.getFullYear() === thisYear;
    });

    const todayOrders = orders.filter(o => {
      const d = new Date(o.createdAt);
      return d.toDateString() === now.toDateString();
    });

    const monthRevenue = monthOrders.reduce((s, o) => s + o.total, 0);
    const todayRevenue = todayOrders.reduce((s, o) => s + o.total, 0);
    const lowStock = products.filter(p => p.stock <= p.minStock);
    const outOfStock = products.filter(p => p.stock === 0);

    // monthly revenue for last 6 months
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(thisYear, thisMonth - i, 1);
      const m = d.getMonth(); const y = d.getFullYear();
      const mo = orders.filter(o => {
        const od = new Date(o.createdAt);
        return od.getMonth() === m && od.getFullYear() === y;
      });
      monthlyData.push({
        label: d.toLocaleString('pt-BR', { month: 'short' }),
        revenue: mo.reduce((s, o) => s + o.total, 0),
        count: mo.length
      });
    }

    // top products by quantity sold
    const productSales = {};
    orders.forEach(o => {
      (o.items || []).forEach(item => {
        productSales[item.productName] = (productSales[item.productName] || 0) + item.quantity;
      });
    });
    const topProducts = Object.entries(productSales)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([name, qty]) => ({ name, qty }));

    // category revenue
    const catRevenue = {};
    orders.forEach(o => {
      (o.items || []).forEach(item => {
        const prod = products.find(p => p.id === item.productId);
        const cat = prod ? prod.category : 'Outros';
        catRevenue[cat] = (catRevenue[cat] || 0) + item.price * item.quantity;
      });
    });

    return {
      totalOrders: orders.length,
      monthOrders: monthOrders.length,
      todayOrders: todayOrders.length,
      monthRevenue,
      todayRevenue,
      totalProducts: products.length,
      lowStock: lowStock.length,
      outOfStock: outOfStock.length,
      monthlyData,
      topProducts,
      catRevenue,
      recentOrders: [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 8)
    };
  },

  // ---- SEED ----
  init() {
    if (this.getProducts().length > 0) return;
    const products = [
      { name: 'Cerveja Lata 350ml', category: 'Bebidas', price: 8.00, cost: 4.00, stock: 120, minStock: 24, unit: 'un', emoji: '🍺' },
      { name: 'Cerveja Long Neck', category: 'Bebidas', price: 12.00, cost: 6.50, stock: 60, minStock: 12, unit: 'un', emoji: '🍺' },
      { name: 'Água Mineral 500ml', category: 'Bebidas', price: 5.00, cost: 1.50, stock: 80, minStock: 20, unit: 'un', emoji: '💧' },
      { name: 'Refrigerante Lata', category: 'Bebidas', price: 7.00, cost: 3.00, stock: 48, minStock: 12, unit: 'un', emoji: '🥤' },
      { name: 'Suco de Laranja', category: 'Bebidas', price: 12.00, cost: 4.00, stock: 20, minStock: 10, unit: 'un', emoji: '🍊' },
      { name: 'Dose de Whisky', category: 'Bebidas', price: 25.00, cost: 10.00, stock: 30, minStock: 5, unit: 'un', emoji: '🥃' },
      { name: 'Caipirinha', category: 'Bebidas', price: 20.00, cost: 6.00, stock: 999, minStock: 0, unit: 'un', emoji: '🍹' },
      { name: 'Pastel de Carne', category: 'Porções', price: 10.00, cost: 4.00, stock: 60, minStock: 10, unit: 'un', emoji: '🥟' },
      { name: 'Pastel de Queijo', category: 'Porções', price: 10.00, cost: 4.00, stock: 60, minStock: 10, unit: 'un', emoji: '🥟' },
      { name: 'Coxinha', category: 'Porções', price: 8.00, cost: 3.00, stock: 50, minStock: 10, unit: 'un', emoji: '🍗' },
      { name: 'Risole', category: 'Porções', price: 8.00, cost: 3.00, stock: 50, minStock: 10, unit: 'un', emoji: '🥟' },
      { name: 'Porcão de Batata Frita', category: 'Porções', price: 30.00, cost: 12.00, stock: 50, minStock: 10, unit: 'un', emoji: '🍟' },
      { name: 'Frango à Passarinho', category: 'Porções', price: 45.00, cost: 18.00, stock: 30, minStock: 5, unit: 'un', emoji: '🍗' },
      { name: 'Bolinho de Bacalhau', category: 'Porções', price: 28.00, cost: 10.00, stock: 40, minStock: 8, unit: 'un', emoji: '🧆' },
      { name: 'Calabresa Acebolada', category: 'Porções', price: 38.00, cost: 14.00, stock: 25, minStock: 5, unit: 'un', emoji: '🥩' },
      { name: 'Picanha na Chapa', category: 'Comidas', price: 65.00, cost: 30.00, stock: 15, minStock: 3, unit: 'un', emoji: '🥩' },
      { name: 'X-Burguer Especial', category: 'Comidas', price: 35.00, cost: 14.00, stock: 20, minStock: 5, unit: 'un', emoji: '🍔' },
      { name: 'Amendoim Torrado', category: 'Outros', price: 10.00, cost: 3.00, stock: 5, minStock: 10, unit: 'un', emoji: '🥜' },
      { name: 'Cigarro', category: 'Outros', price: 15.00, cost: 10.00, stock: 3, minStock: 5, unit: 'cx', emoji: '🚬' },
    ];

    const now = new Date();
    products.forEach(p => {
      p.id = this.nextId();
      p.createdAt = new Date().toISOString();
    });
    this.saveProducts(products);

    // seed some orders for history
    const seedOrders = [];
    const clients = ['Mesa 1', 'Mesa 2', 'Mesa 3', 'Mesa 4', 'Balcão', 'Mesa 5', 'Mesa 6'];
    for (let i = 0; i < 80; i++) {
      const daysAgo = Math.floor(Math.random() * 180);
      const date = new Date(now);
      date.setDate(date.getDate() - daysAgo);
      const numItems = Math.floor(Math.random() * 4) + 1;
      const items = [];
      for (let j = 0; j < numItems; j++) {
        const p = products[Math.floor(Math.random() * products.length)];
        const qty = Math.floor(Math.random() * 3) + 1;
        items.push({ productId: p.id, productName: p.name, quantity: qty, price: p.price });
      }
      const total = items.reduce((s, it) => s + it.price * it.quantity, 0);
      const order = {
        id: this.nextId(),
        orderNumber: `PED-${String(i + 1).padStart(4, '0')}`,
        client: clients[Math.floor(Math.random() * clients.length)],
        items,
        total,
        status: Math.random() > 0.05 ? 'pago' : 'cancelado',
        createdAt: date.toISOString(),
        updatedAt: date.toISOString()
      };
      seedOrders.push(order);
    }
    this.saveOrders(seedOrders);
  }
};

// format helpers
function fmtMoney(v) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);
}
function fmtDate(iso, withTime = false) {
  if (!iso) return '-';
  const d = new Date(iso);
  const opts = { day: '2-digit', month: '2-digit', year: 'numeric' };
  if (withTime) { opts.hour = '2-digit'; opts.minute = '2-digit'; }
  return d.toLocaleString('pt-BR', opts);
}
function escHtml(s) {
  return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}
function toast(msg, type = 'default') {
  const c = document.getElementById('toastContainer') || (() => {
    const el = document.createElement('div');
    el.id = 'toastContainer';
    el.className = 'toast-container';
    document.body.appendChild(el);
    return el;
  })();
  const icons = { success: svgCheck, error: svgX, warning: svgWarn, default: svgInfo };
  const t = document.createElement('div');
  t.className = `toast ${type}`;
  t.innerHTML = `${icons[type] || icons.default}<span>${escHtml(msg)}</span>`;
  c.appendChild(t);
  setTimeout(() => t.classList.add('show'), 10);
  setTimeout(() => { t.classList.remove('show'); setTimeout(() => t.remove(), 350) }, 3000);
}
const svgCheck = `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5"/></svg>`;
const svgX = `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M18 6 6 18M6 6l12 12"/></svg>`;
const svgWarn = `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><path d="M12 9v4m0 4h.01M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/></svg>`;
const svgInfo = `<svg fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4m0-4h.01"/></svg>`;
