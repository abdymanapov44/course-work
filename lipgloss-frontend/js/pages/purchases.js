async function purchases() {
  setPage(loadingHTML);
  try {
    const [data, matList, empList, budgetData] = await Promise.all([
      api.purchases.list(),
      lookup.materials(),
      lookup.employees(),
      api.budget.get(),
    ]);
    renderPurchases(data, matList, empList, budgetData);
  } catch(e) {
    setPage(`<div class="alert alert-danger">${e.message}</div>`);
  }
}

function renderPurchases(data, matList, empList, budgetData) {
  const tableHTML = buildTable({
    columns: [
      { key: 'id',          label: 'ID' },
      { key: 'material_id', label: 'Сырьё',      render: r => lookup.find(matList, r.material_id) },
      { key: 'quantity',    label: 'Кол-во',      render: r => fmt.num(r.quantity) },
      { key: 'amount',      label: 'Сумма',       render: r => fmt.money(r.amount) },
      { key: 'date',        label: 'Дата',        render: r => fmt.date(r.date) },
      { key: 'employee_id', label: 'Сотрудник',   render: r => lookup.find(empList, r.employee_id, 'full_name') },
    ],
    rows: data,
    onDelete: `async function(id){ await purchasesDelete(id) }`,
  });

  setPage(`
    <div class="page-header">
      <div>
        <div class="page-title">Закупка сырья</div>
        <div class="page-subtitle">При добавлении проверяется наличие бюджета (хранимая процедура)</div>
      </div>
      <button class="btn btn-primary" onclick="purchasesCreate()">+ Закупить</button>
    </div>

    <div class="alert alert-warning" style="margin-bottom:20px">
      <div>Текущий бюджет: <b>${fmt.money(budgetData.amount)}</b> — сумма закупки будет списана автоматически через триггер.</div>
    </div>

    <div class="table-card">${tableHTML}</div>
  `);
}

async function purchasesCreate() {
  const [matList, empList, budgetData] = await Promise.all([
    lookup.materials(),
    lookup.employees(),
    api.budget.get(),
  ]);

  Modal.open({
    title: 'Закупка сырья',
    body: `
      <div class="alert alert-warning" style="margin-bottom:16px">
        <span>сом</span> Доступный бюджет: <b>${fmt.money(budgetData.amount)}</b>
      </div>
      <form id="purchase-form">
        <div class="form-group">
          <label>Сырьё</label>
          ${buildSelect('material_id', matList, 'id', 'name')}
        </div>
        <div class="form-row">
          <div class="form-group">
            <label>Количество</label>
            <input type="number" name="quantity" placeholder="10.000" min="0.001" step="0.001" required />
          </div>
          <div class="form-group">
            <label>Сумма (сом)</label>
            <input type="number" name="amount" id="purchase-amount" placeholder="50000" min="0.01" step="0.01" required
              oninput="purchasesCheckBudget(this.value, ${budgetData.amount})" />
          </div>
        </div>
        <div id="budget-check-msg"></div>
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
      <button class="btn btn-primary" id="purchase-save-btn" onclick="purchasesSave()">Закупить</button>`,
  });
}

// Real-time budget check in the form
function purchasesCheckBudget(value, budgetAmt) {
  const msg = document.getElementById('budget-check-msg');
  const btn = document.getElementById('purchase-save-btn');
  if (!value || Number(value) <= 0) { msg.innerHTML = ''; return; }
  const amt = Number(value);
  if (amt > budgetAmt) {
    msg.innerHTML = `<div class="alert alert-danger" style="margin-bottom:12px">
      ✗ Недостаточно средств. Бюджет: ${fmt.money(budgetAmt)}, запрашивается: ${fmt.money(amt)}
    </div>`;
    btn.disabled = true;
    btn.style.opacity = '0.5';
  } else {
    msg.innerHTML = `<div class="alert alert-success" style="margin-bottom:12px">
      ✓ Средств достаточно. Остаток после закупки: ${fmt.money(budgetAmt - amt)}
    </div>`;
    btn.disabled = false;
    btn.style.opacity = '1';
  }
}

async function purchasesSave() {
  const form = document.getElementById('purchase-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const data = readForm(form);

  const btn = document.getElementById('purchase-save-btn');
  btn.textContent = 'Проверка...';
  btn.disabled = true;

  try {
    // POST to /api/purchases — backend calls stored procedure sp_check_and_purchase
    await api.purchases.create(data);
    lookup.clear('materials');
    Modal.close();
    Toast.success('Закупка выполнена. Бюджет и склад обновлены.');
    refreshBudget();
    await purchases();
  } catch(e) {
    // Server returns 400 if stored procedure returns result=1 (insufficient budget)
    Toast.error(e.message);
    btn.textContent = 'Закупить';
    btn.disabled = false;
  }
}

async function purchasesDelete(id) {
  confirmDelete('запись о закупке', async () => {
    try {
      await api.purchases.remove(id);
      Toast.success('Удалено');
      refreshBudget();
      await purchases();
    } catch(e) { Toast.error(e.message); }
  });
}
