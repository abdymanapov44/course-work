// ─── Toast notifications ───────────────────────────────────────────
const Toast = {
  _timer: null,
  show(msg, type = 'default', duration = 3000) {
    const el = document.getElementById('toast');
    el.textContent = msg;
    el.className = `toast ${type}`;
    clearTimeout(this._timer);
    this._timer = setTimeout(() => el.classList.add('hidden'), duration);
  },
  success: (msg) => Toast.show(msg, 'success'),
  error:   (msg) => Toast.show(msg, 'error', 4500),
  warning: (msg) => Toast.show(msg, 'warning', 4000),
};

// ─── Modal ─────────────────────────────────────────────────────────
const Modal = {
  open({ title, body, footer }) {
    document.getElementById('modal-title').textContent = title;
    document.getElementById('modal-body').innerHTML = body;
    document.getElementById('modal-footer').innerHTML = footer || '';
    document.getElementById('modal-overlay').classList.remove('hidden');
  },
  close() {
    document.getElementById('modal-overlay').classList.add('hidden');
  },
  setFooter(html) {
    document.getElementById('modal-footer').innerHTML = html;
  },
};

document.getElementById('modal-close').addEventListener('click', Modal.close);
document.getElementById('modal-overlay').addEventListener('click', e => {
  if (e.target === document.getElementById('modal-overlay')) Modal.close();
});

// ─── Format helpers ────────────────────────────────────────────────
const fmt = {
  money: (n) => Number(n).toLocaleString('ru-RU', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' сом',
  num:   (n) => Number(n).toLocaleString('ru-RU', { maximumFractionDigits: 4 }),
  date:  (d) => d ? new Date(d).toLocaleDateString('ru-RU') : '—',
  dateInput: () => new Date().toISOString().split('T')[0],
};

// ─── Lookup helpers ────────────────────────────────────────────────
const lookup = {
  _cache: {},
  async units()     { return this._cache.units     ||= await api.units.list(); },
  async positions() { return this._cache.positions ||= await api.positions.list(); },
  async employees() { return this._cache.employees ||= await api.employees.list(); },
  async materials() { return this._cache.materials ||= await api.rawMaterials.list(); },
  async products()  { return this._cache.products  ||= await api.products.list(); },
  clear(key)        { if (key) delete this._cache[key]; else this._cache = {}; },

  find(arr, id, field = 'name') {
    const item = arr.find(x => x.id == id);
    return item ? item[field] : '—';
  },
};

// ─── Select builder ────────────────────────────────────────────────
function buildSelect(name, items, valueField, labelField, selected = '', placeholder = '— выберите —') {
  const opts = items.map(i =>
    `<option value="${i[valueField]}" ${i[valueField] == selected ? 'selected' : ''}>${i[labelField]}</option>`
  ).join('');
  return `<select name="${name}" id="${name}" required>
    <option value="">${placeholder}</option>
    ${opts}
  </select>`;
}

// ─── Generic CRUD table builder ────────────────────────────────────
function buildTable({ columns, rows, onEdit, onDelete }) {
  if (!rows.length) {
    return `<div class="empty-state">
      <div class="empty-icon">◌</div>
      <div class="empty-text">Нет данных</div>
    </div>`;
  }
  const thead = columns.map(c => `<th>${c.label}</th>`).join('') + '<th></th>';
  const tbody = rows.map(row => {
    const cells = columns.map(c => `<td>${c.render ? c.render(row) : (row[c.key] ?? '—')}</td>`).join('');
    const actions = `<td class="text-right">
      <div class="td-actions" style="justify-content:flex-end">
        ${onEdit   ? `<button class="btn btn-secondary btn-sm" onclick="(${onEdit})(${row.id})">Изменить</button>` : ''}
        ${onDelete ? `<button class="btn btn-danger btn-sm"    onclick="(${onDelete})(${row.id})">Удалить</button>` : ''}
      </div>
    </td>`;
    return `<tr>${cells}${actions}</tr>`;
  }).join('');
  return `<table><thead><tr>${thead}</tr></thead><tbody>${tbody}</tbody></table>`;
}

// ─── Loading placeholder ───────────────────────────────────────────
const loadingHTML = `<div class="loading"><div class="spinner"></div> Загрузка...</div>`;

// ─── Page container helper ─────────────────────────────────────────
function setPage(html) {
  document.getElementById('page-container').innerHTML = html;
}

// ─── Confirm helper ────────────────────────────────────────────────
function confirmDelete(name, onConfirm) {
  Modal.open({
    title: 'Подтвердите удаление',
    body: `<p style="color:var(--ink-mid)">Вы уверены, что хотите удалить <b>${name}</b>? Это действие необратимо.</p>`,
    footer: `
      <button class="btn btn-secondary" onclick="Modal.close()">Отмена</button>
      <button class="btn btn-danger" id="confirm-del-btn">Удалить</button>`,
  });
  setTimeout(() => {
    document.getElementById('confirm-del-btn')?.addEventListener('click', async () => {
      Modal.close();
      await onConfirm();
    });
  }, 0);
}

// ─── Form value reader ─────────────────────────────────────────────
function readForm(formEl) {
  const data = {};
  new FormData(formEl).forEach((v, k) => { data[k] = v; });
  return data;
}

// ─── Sidebar budget refresh ────────────────────────────────────────
async function refreshBudget() {
  try {
    const b = await api.budget.get();
    document.getElementById('sidebar-budget').textContent = fmt.money(b.amount);
  } catch {
    document.getElementById('sidebar-budget').textContent = '—';
  }
}
