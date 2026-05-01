async function budget() {
  setPage(loadingHTML);
  try {
    const b = await api.budget.get();
    renderBudget(b);
  } catch(e) {
    setPage(`<div class="alert alert-danger">${e.message}</div>`);
  }
}

function renderBudget(b) {
  setPage(`
    <div class="page-header">
      <div>
        <div class="page-title">Бюджет</div>
        <div class="page-subtitle">Финансовые средства предприятия</div>
      </div>
    </div>

    <div style="display:flex;gap:24px;align-items:flex-start;flex-wrap:wrap">
      <div class="budget-card">
        <div class="stat-label">Текущий баланс</div>
        <div class="budget-amount">
          <span class="budget-currency"></span>${Number(b.amount).toLocaleString('ru-RU', {minimumFractionDigits:2, maximumFractionDigits:2})}
        </div>
        <div class="stat-unit" style="margin-bottom:24px">доступно на счёте</div>
        <button class="btn btn-primary" onclick="budgetEdit(${b.amount})">Изменить бюджет</button>
      </div>

      <div style="flex:1;min-width:260px">
        <div class="alert alert-warning">
          <span>⚠</span>
          <div>
            <b>Важно:</b> бюджет автоматически уменьшается при закупке сырья и увеличивается при продаже продукции. 
            Ручное изменение используется только для начальной установки.
          </div>
        </div>
        <div class="table-card" style="margin-top:16px">
          <div style="padding:16px 20px;border-bottom:1px solid var(--border-soft)">
            <b style="font-size:13px">Как работает бюджет</b>
          </div>
          <table>
            <thead><tr><th>Операция</th><th>Эффект</th></tr></thead>
            <tbody>
              <tr><td>Закупка сырья</td><td><span class="badge badge-red">− сумма закупки</span></td></tr>
              <tr><td>Производство</td><td><span class="badge" style="background:#eee;color:#555">без изменений</span></td></tr>
              <tr><td>Продажа продукции</td><td><span class="badge badge-green">+ сумма продажи</span></td></tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `);
}

function budgetEdit(current) {
  Modal.open({
    title: 'Установить бюджет',
    body: `<form id="budget-form">
      <div class="form-group">
        <label>Сумма бюджета (₸)</label>
        <input type="number" name="amount" value="${current}" min="0" step="0.01" required />
        <div class="form-hint">Введите начальную сумму финансовых средств предприятия</div>
      </div>
    </form>`,
    footer: `
      <button class="btn btn-secondary" onclick="Modal.close()">Отмена</button>
      <button class="btn btn-primary" onclick="budgetSave()">Сохранить</button>`,
  });
}

async function budgetSave() {
  const form = document.getElementById('budget-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const data = readForm(form);
  try {
    await api.budget.set(Number(data.amount));
    Modal.close();
    Toast.success('Бюджет обновлён');
    refreshBudget();
    await budget();
  } catch(e) { Toast.error(e.message); }
}
