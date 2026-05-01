async function dashboard() {
  setPage(loadingHTML);
  try {
    const [budgetData, materials, prods, purchases, salesData] = await Promise.all([
      api.budget.get(),
      api.rawMaterials.list(),
      api.products.list(),
      api.purchases.list(),
      api.sales.list(),
    ]);

    const totalMaterialsAmt = materials.reduce((s, m) => s + Number(m.amount), 0);
    const totalProductsAmt  = prods.reduce((s, p) => s + Number(p.amount), 0);
    const totalSalesAmt     = salesData.reduce((s, x) => s + Number(x.amount), 0);
    const totalPurchasesAmt = purchases.reduce((s, x) => s + Number(x.amount), 0);

    const recentPurchases = [...purchases].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    const recentSales     = [...salesData].sort((a,b) => new Date(b.date) - new Date(a.date)).slice(0, 5);

    setPage(`
      <div class="page-header">
        <div>
          <div class="page-title">Дашборд</div>
          <div class="page-subtitle">Обзор состояния предприятия</div>
        </div>
      </div>

      <div class="stats-grid">
        <div class="stat-card gold">
          <div class="stat-label">Бюджет</div>
          <div class="stat-value">${fmt.money(budgetData.amount)}</div>
          <div class="stat-unit">доступно</div>
        </div>
        <div class="stat-card">
          <div class="stat-label">Склад сырья</div>
          <div class="stat-value">${fmt.money(totalMaterialsAmt)}</div>
          <div class="stat-unit">${materials.length} видов сырья</div>
        </div>
        <div class="stat-card success">
          <div class="stat-label">Готовая продукция</div>
          <div class="stat-value">${fmt.money(totalProductsAmt)}</div>
          <div class="stat-unit">${prods.length} видов продукции</div>
        </div>
        <div class="stat-card soft">
          <div class="stat-label">Выручка всего</div>
          <div class="stat-value">${fmt.money(totalSalesAmt)}</div>
          <div class="stat-unit">за всё время</div>
        </div>
      </div>

      <div class="cycle-flow">
        <div class="cycle-step">
          <div class="cycle-step-num">Шаг 1</div>
          <div class="cycle-step-name">Закупка сырья</div>
          <div class="cycle-step-desc">Бюджет → Склад</div>
        </div>
        <div class="cycle-arrow">›</div>
        <div class="cycle-step">
          <div class="cycle-step-num">Шаг 2</div>
          <div class="cycle-step-name">Производство</div>
          <div class="cycle-step-desc">Сырьё → Продукция</div>
        </div>
        <div class="cycle-arrow">›</div>
        <div class="cycle-step">
          <div class="cycle-step-num">Шаг 3</div>
          <div class="cycle-step-name">Продажа</div>
          <div class="cycle-step-desc">Продукция → Бюджет</div>
        </div>
      </div>

      <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
        <div>
          <div class="dash-section-title">Последние закупки</div>
          <div class="table-card">
            ${recentPurchases.length ? `
            <table>
              <thead><tr><th>Дата</th><th>Сумма</th></tr></thead>
              <tbody>
                ${recentPurchases.map(p => `
                  <tr>
                    <td>${fmt.date(p.date)}</td>
                    <td>${fmt.money(p.amount)}</td>
                  </tr>`).join('')}
              </tbody>
            </table>` : '<div class="empty-state"><div class="empty-text">Нет закупок</div></div>'}
          </div>
        </div>
        <div>
          <div class="dash-section-title">Последние продажи</div>
          <div class="table-card">
            ${recentSales.length ? `
            <table>
              <thead><tr><th>Дата</th><th>Сумма</th></tr></thead>
              <tbody>
                ${recentSales.map(s => `
                  <tr>
                    <td>${fmt.date(s.date)}</td>
                    <td>${fmt.money(s.amount)}</td>
                  </tr>`).join('')}
              </tbody>
            </table>` : '<div class="empty-state"><div class="empty-text">Нет продаж</div></div>'}
          </div>
        </div>
      </div>
    `);
  } catch(e) {
    setPage(`<div class="alert alert-danger">Ошибка загрузки: ${e.message}</div>`);
  }
}
