async function production() {
  setPage(loadingHTML);
  try {
    const [data, prodList, empList, matList] = await Promise.all([
      api.production.list(),
      lookup.products(),
      lookup.employees(),
      lookup.materials(),
    ]);
    renderProduction(data, prodList, empList);
  } catch(e) {
    setPage(`<div class="alert alert-danger">${e.message}</div>`);
  }
}

function renderProduction(data, prodList, empList) {
  const tableHTML = buildTable({
    columns: [
      { key: 'id',          label: 'ID' },
      { key: 'product_id',  label: 'Продукция',  render: r => lookup.find(prodList, r.product_id) },
      { key: 'quantity',    label: 'Кол-во',     render: r => fmt.num(r.quantity) },
      { key: 'date',        label: 'Дата',       render: r => fmt.date(r.date) },
      { key: 'employee_id', label: 'Сотрудник',  render: r => lookup.find(empList, r.employee_id, 'full_name') },
    ],
    rows: data,
    onDelete: `async function(id){ await productionDelete(id) }`,
  });

  setPage(`
    <div class="page-header">
      <div>
        <div class="page-title">Производство</div>
        <div class="page-subtitle">Выпуск готовой продукции из сырья</div>
      </div>
      <button class="btn btn-primary" onclick="productionCreate()">+ Выпустить</button>
    </div>

    <div class="alert alert-warning" style="margin-bottom:20px">
      <span>⚙</span>
      При добавлении: склад сырья уменьшается согласно ингредиентам, склад продукции увеличивается.
    </div>

    <div class="table-card">${tableHTML}</div>
  `);
}

async function productionCreate() {
  const [prodList, empList] = await Promise.all([lookup.products(), lookup.employees()]);

  Modal.open({
    title: 'Выпуск продукции',
    body: `<form id="prod-op-form">
      <div class="form-group">
        <label>Продукция</label>
        ${buildSelect('product_id', prodList, 'id', 'name')}
        <div class="form-hint">После выбора можно посмотреть состав ниже</div>
      </div>
      <div class="form-group">
        <label>Количество единиц</label>
        <input type="number" name="quantity" placeholder="100" min="0.001" step="0.001" required />
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Дата</label>
          <input type="date" name="date" value="${fmt.dateInput()}" required />
        </div>
        <div class="form-group">
          <label>Сотрудник</label>
          ${buildSelect('employee_id', empList, 'id', 'full_name')}
        </div>
      </div>
      <div id="ingredients-preview"></div>
    </form>`,
    footer: `
      <button class="btn btn-secondary" onclick="Modal.close()">Отмена</button>
      <button class="btn btn-primary" onclick="productionSave()">Выпустить</button>`,
  });

  // Show ingredients when product is selected
  setTimeout(() => {
    const sel = document.getElementById('product_id');
    if (sel) sel.addEventListener('change', productionLoadIngredients);
  }, 0);
}

async function productionLoadIngredients() {
  const pid = document.getElementById('product_id').value;
  const preview = document.getElementById('ingredients-preview');
  if (!pid) { preview.innerHTML = ''; return; }
  try {
    const items = await api.ingredients.byProduct(pid);
    const matList = await lookup.materials();
    if (!items.length) {
      preview.innerHTML = `<div class="form-hint" style="color:var(--warning)">⚠ Ингредиенты не заданы для этой продукции</div>`;
      return;
    }
    const rows = items.map(i => `<tr>
      <td>${lookup.find(matList, i.material_id)}</td>
      <td>${fmt.num(i.quantity)} (на ед.)</td>
    </tr>`).join('');
    preview.innerHTML = `
      <div style="margin-top:12px;font-size:12px;font-weight:500;color:var(--ink-soft);text-transform:uppercase;letter-spacing:.05em;margin-bottom:6px">Состав продукции</div>
      <div class="table-card">
        <table><thead><tr><th>Сырьё</th><th>Кол-во на ед.</th></tr></thead>
        <tbody>${rows}</tbody></table>
      </div>`;
  } catch { preview.innerHTML = ''; }
}

async function productionSave() {
  const form = document.getElementById('prod-op-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const data = readForm(form);
  try {
    await api.production.create(data);
    lookup.clear('products');
    lookup.clear('materials');
    Modal.close();
    Toast.success('Производство записано. Склад обновлён.');
    await production();
  } catch(e) { Toast.error(e.message); }
}

async function productionDelete(id) {
  confirmDelete('запись о производстве', async () => {
    try {
      await api.production.remove(id);
      Toast.success('Удалено');
      await production();
    } catch(e) { Toast.error(e.message); }
  });
}
