const API_BASE = 'http://localhost:3000/api';

const api = {
  async request(method, path, body = null) {
    const opts = {
      method,
      headers: { 'Content-Type': 'application/json' },
    };
    if (body) opts.body = JSON.stringify(body);
    const res = await fetch(API_BASE + path, opts);
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || 'Ошибка сервера');
    return data;
  },

  get:    (path)        => api.request('GET',    path),
  post:   (path, body)  => api.request('POST',   path, body),
  put:    (path, body)  => api.request('PUT',    path, body),
  delete: (path)        => api.request('DELETE', path),

  // ── Единицы измерения ──
  units: {
    list:   ()      => api.get('/units'),
    create: (data)  => api.post('/units', data),
    update: (id, d) => api.put(`/units/${id}`, d),
    remove: (id)    => api.delete(`/units/${id}`),
  },

  // ── Должности ──
  positions: {
    list:   ()      => api.get('/positions'),
    create: (data)  => api.post('/positions', data),
    update: (id, d) => api.put(`/positions/${id}`, d),
    remove: (id)    => api.delete(`/positions/${id}`),
  },

  // ── Сырьё ──
  rawMaterials: {
    list:   ()      => api.get('/raw-materials'),
    create: (data)  => api.post('/raw-materials', data),
    update: (id, d) => api.put(`/raw-materials/${id}`, d),
    remove: (id)    => api.delete(`/raw-materials/${id}`),
  },

  // ── Готовая продукция ──
  products: {
    list:   ()      => api.get('/products'),
    create: (data)  => api.post('/products', data),
    update: (id, d) => api.put(`/products/${id}`, d),
    remove: (id)    => api.delete(`/products/${id}`),
  },

  // ── Сотрудники ──
  employees: {
    list:   ()      => api.get('/employees'),
    create: (data)  => api.post('/employees', data),
    update: (id, d) => api.put(`/employees/${id}`, d),
    remove: (id)    => api.delete(`/employees/${id}`),
  },

  // ── Ингредиенты ──
  ingredients: {
    list:        ()      => api.get('/ingredients'),
    byProduct:   (pid)   => api.get(`/ingredients/product/${pid}`),
    create:      (data)  => api.post('/ingredients', data),
    update:      (id, d) => api.put(`/ingredients/${id}`, d),
    remove:      (id)    => api.delete(`/ingredients/${id}`),
  },

  // ── Бюджет ──
  budget: {
    get:    ()     => api.get('/budget'),
    set:    (amt)  => api.post('/budget', { amount: amt }),
  },

  // ── Закупка сырья ──
  purchases: {
    list:   ()     => api.get('/purchases'),
    create: (data) => api.post('/purchases', data),   // вызывает хранимую процедуру
    remove: (id)   => api.delete(`/purchases/${id}`),
  },

  // ── Производство ──
  production: {
    list:   ()     => api.get('/production'),
    create: (data) => api.post('/production', data),
    remove: (id)   => api.delete(`/production/${id}`),
  },

  // ── Продажи ──
  sales: {
    list:   ()     => api.get('/sales'),
    create: (data) => api.post('/sales', data),
    remove: (id)   => api.delete(`/sales/${id}`),
  },

  // ── Отчёты ──
  reports: {
    purchases: (from, to) => api.get(`/reports/purchases?from=${from}&to=${to}`),
    sales:     (from, to) => api.get(`/reports/sales?from=${from}&to=${to}`),
  },
};
