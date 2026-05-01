async function sales() {
  setPage(loadingHTML);
  try {
    const [data, prodList, empList] = await Promise.all([
      api.sales.list(),
      lookup.products(),
      lookup.employees(),
    ]);
    renderSales(data, prodList, empList);
  } catch(e) {
    setPage(`<div class="alert alert-danger">${e.message}</div>`);
  }
}

function renderSales(data, prodList, empList) {
  const totalAmt = data.reduce((s, x) => s + Number(x.amount), 0);

  const tableHTML = buildTable({
    columns: [
      { key: 'id',          label: 'ID' },
      { key: 'product_id',  label: 'Продукция',  render: r => lookup.find(prodList, r.product_id) },
      { key: 'quantity',    label: 'Кол-во',     render: r => fmt.num(r.quantity) },
      { key: 'amount',      label: 'Сумма',      render: r => fmt.money(r.amount) },
      { key: 'date',        label: 'Дата',       render: r => fmt.date(r.date) },
      { key: 'employee_id', label: 'Сотрудник',  render: r => lookup.find(empList, r.employee_id, 'full_name') },
    ],
    rows: data,
    onDelete: `async function(id){ await salesDelete(id) }`,
  });

  setPage(`
    <div class="page-header">
      <div>
        <div class="page-title">Продажа продукции</div>
        <div class="page-subtitle">Реализация готовой продукции клиентам</div>
      </div>
      <button class="btn btn-primary" onclick="salesCreate()">+ Продать</button>
    </div>

    ${data.length ? `
    <div class="stats-grid" style="margin-bottom:20px">
      <div class="stat-card success">
        <div class="stat-label">Выручка всего</div>
        <div class="stat-value">${fmt.money(totalAmt)}</div>
      </div>
      <div class="stat-card soft">
        <div class="stat-label">Продаж</div>
        <div class="stat-value">${data.length}</div>
        <div class="stat-unit">записей</div>
      </div>
    </div>` : ''}

    <div class="alert alert-warning" style="margin-bottom:20px">
      <span>💡</span>
      При продаже бюджет увеличивается, склад готовой продукции уменьшается. Продавайте по цене выше себестоимости.
    </div>

    <div class="table-card">${tableHTML}</div>
  `);
}

async function salesCreate() {
  const [prodList, empList] = await Promise.all([lookup.products(), lookup.employees()]);

  Modal.open({
    title: 'Оформить продажу',
    body: `<form id="sale-form">
      <div class="form-group">
        <label>Продукция</label>
        ${buildSelect('product_id', prodList, 'id', 'name')}
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Количество</label>
          <input type="number" name="quantity" placeholder="50" min="0.001" step="0.001" required />
        </div>
        <div class="form-group">
          <label>Сумма продажи (₸)</label>
          <input type="number" name="amount" placeholder="75000" min="0.01" step="0.01" required />
          <div class="form-hint">Должна быть выше себестоимости</div>
        </div>
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
    </form>`,
    footer: `
      <button class="btn btn-secondary" onclick="Modal.close()">Отмена</button>
      <button class="btn btn-primary" onclick="salesSave()">Продать</button>`,
  });
}

async function salesSave() {
  const form = document.getElementById('sale-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const data = readForm(form);
  try {
    await api.sales.create(data);
    lookup.clear('products');
    Modal.close();
    Toast.success('Продажа оформлена. Бюджет и склад обновлены.');
    refreshBudget();
    await sales();
  } catch(e) { Toast.error(e.message); }
}

async function salesDelete(id) {
  confirmDelete('запись о продаже', async () => {
    try {
      await api.sales.remove(id);
      Toast.success('Удалено');
      refreshBudget();
      await sales();
    } catch(e) { Toast.error(e.message); }
  });
}
