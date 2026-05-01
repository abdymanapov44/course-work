async function reports(type = 'purchases') {
  setPage(loadingHTML);

  const today = fmt.dateInput();
  const monthAgo = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString().split('T')[0];

  setPage(`
    <div class="page-header">
      <div>
        <div class="page-title">${type === 'purchases' ? 'Отчёт по закупкам' : 'Отчёт по продажам'}</div>
        <div class="page-subtitle">Фильтрация по периоду</div>
      </div>
      <div style="display:flex;gap:8px">
        <button class="btn ${type==='purchases'?'btn-primary':'btn-secondary'}" onclick="reports('purchases')">Закупки</button>
        <button class="btn ${type==='sales'?'btn-primary':'btn-secondary'}" onclick="reports('sales')">Продажи</button>
      </div>
    </div>

    <div class="report-filters">
      <div class="form-group">
        <label>С даты</label>
        <input type="date" id="report-from" value="${monthAgo}" />
      </div>
      <div class="form-group">
        <label>По дату</label>
        <input type="date" id="report-to" value="${today}" />
      </div>
      <button class="btn btn-primary" onclick="reportsLoad('${type}')">Применить</button>
      <button class="btn btn-secondary" onclick="reportsExportCSV('${type}')">Экспорт CSV</button>
    </div>

    <div id="report-content">
      ${loadingHTML}
    </div>
  `);

  await reportsLoad(type);
}

async function reportsLoad(type) {
  const from = document.getElementById('report-from').value;
  const to   = document.getElementById('report-to').value;
  const content = document.getElementById('report-content');
  content.innerHTML = loadingHTML;

  try {
    const [data, prodList, matList, empList] = await Promise.all([
      type === 'purchases' ? api.reports.purchases(from, to) : api.reports.sales(from, to),
      lookup.products(),
      lookup.materials(),
      lookup.employees(),
    ]);

    const totalAmt = data.reduce((s, x) => s + Number(x.amount), 0);
    const totalQty = data.reduce((s, x) => s + Number(x.quantity), 0);

    let tableHTML;
    if (type === 'purchases') {
      tableHTML = buildTable({
        columns: [
          { key: 'id',          label: 'ID' },
          { key: 'material_id', label: 'Сырьё',     render: r => lookup.find(matList, r.material_id) },
          { key: 'quantity',    label: 'Кол-во',    render: r => fmt.num(r.quantity) },
          { key: 'amount',      label: 'Сумма',     render: r => fmt.money(r.amount) },
          { key: 'date',        label: 'Дата',      render: r => fmt.date(r.date) },
          { key: 'employee_id', label: 'Сотрудник', render: r => lookup.find(empList, r.employee_id, 'full_name') },
        ],
        rows: data,
      });
    } else {
      tableHTML = buildTable({
        columns: [
          { key: 'id',          label: 'ID' },
          { key: 'product_id',  label: 'Продукция', render: r => lookup.find(prodList, r.product_id) },
          { key: 'quantity',    label: 'Кол-во',    render: r => fmt.num(r.quantity) },
          { key: 'amount',      label: 'Сумма',     render: r => fmt.money(r.amount) },
          { key: 'date',        label: 'Дата',      render: r => fmt.date(r.date) },
          { key: 'employee_id', label: 'Сотрудник', render: r => lookup.find(empList, r.employee_id, 'full_name') },
        ],
        rows: data,
      });
    }

    content.innerHTML = `
      <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:20px">
        <div class="stat-card ${type==='purchases'?'':'success'}">
          <div class="stat-label">${type==='purchases'?'Потрачено':'Выручка'} за период</div>
          <div class="stat-value">${fmt.money(totalAmt)}</div>
        </div>
        <div class="stat-card soft">
          <div class="stat-label">Записей</div>
          <div class="stat-value">${data.length}</div>
        </div>
        <div class="stat-card soft">
          <div class="stat-label">Всего кол-во</div>
          <div class="stat-value">${fmt.num(totalQty)}</div>
        </div>
      </div>
      <div class="table-card">${tableHTML}</div>
    `;

    // store for CSV export
    window._reportData = data;
    window._reportType = type;
    window._reportProdList = prodList;
    window._reportMatList  = matList;
    window._reportEmpList  = empList;

  } catch(e) {
    content.innerHTML = `<div class="alert alert-danger">${e.message}</div>`;
  }
}

function reportsExportCSV(type) {
  const data = window._reportData;
  if (!data || !data.length) { Toast.warning('Нет данных для экспорта'); return; }

  const matList  = window._reportMatList  || [];
  const prodList = window._reportProdList || [];
  const empList  = window._reportEmpList  || [];

  let rows;
  if (type === 'purchases') {
    rows = [['ID', 'Сырьё', 'Количество', 'Сумма', 'Дата', 'Сотрудник']];
    data.forEach(r => rows.push([
      r.id,
      lookup.find(matList, r.material_id),
      r.quantity,
      r.amount,
      fmt.date(r.date),
      lookup.find(empList, r.employee_id, 'full_name'),
    ]));
  } else {
    rows = [['ID', 'Продукция', 'Количество', 'Сумма', 'Дата', 'Сотрудник']];
    data.forEach(r => rows.push([
      r.id,
      lookup.find(prodList, r.product_id),
      r.quantity,
      r.amount,
      fmt.date(r.date),
      lookup.find(empList, r.employee_id, 'full_name'),
    ]));
  }

  const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n');
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8' });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement('a');
  a.href     = url;
  a.download = `report_${type}_${fmt.dateInput()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  Toast.success('CSV-файл скачан');
}
