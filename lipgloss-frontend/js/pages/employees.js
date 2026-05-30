async function employees() {
  setPage(loadingHTML);
  try {
    const [data, posList] = await Promise.all([api.employees.list(), lookup.positions()]);
    renderEmployees(data, posList);
  } catch(e) {
    setPage(`<div class="alert alert-danger">${e.message}</div>`);
  }
}

function renderEmployees(data, posList) {
  const tableHTML = buildTable({
    columns: [
      { key: 'id',          label: 'ID' },
      { key: 'full_name',   label: 'ФИО' },
      { key: 'position_id', label: 'Должность', render: r => lookup.find(posList, r.position_id, 'title') },
      { key: 'salary',      label: 'Оклад',     render: r => fmt.money(r.salary) },
      { key: 'phone',       label: 'Телефон' },
      { key: 'address',     label: 'Адрес' },
    ],
    rows: data,
    onEdit:   `async function(id){ await employeesEdit(id) }`,
    onDelete: `async function(id){ await employeesDelete(id) }`,
  });

  setPage(`
    <div class="page-header">
      <div>
        <div class="page-title">Сотрудники</div>
        <div class="page-subtitle">Персонал предприятия</div>
      </div>
      <button class="btn btn-primary" onclick="employeesCreate()">+ Добавить</button>
    </div>
    <div class="table-card">${tableHTML}</div>
  `);
}

async function employeesCreate() {
  const posList = await lookup.positions();
  Modal.open({
    title: 'Добавить сотрудника',
    body: `<form id="emp-form">
      <div class="form-group">
        <label>ФИО</label>
        <input type="text" name="full_name" placeholder="Иванова Айгуль Маратовна" required />
      </div>
      <div class="form-group">
        <label>Должность</label>
        ${buildSelect('position_id', posList, 'id', 'title')}
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Оклад (сом)</label>
          <input type="number" name="salary" placeholder="150000" min="0" step="0.01" required />
        </div>
        <div class="form-group">
          <label>Телефон</label>
          <input type="tel" name="phone" placeholder="+7 700 000 0000" />
        </div>
      </div>
      <div class="form-group">
        <label>Адрес</label>
        <input type="text" name="address" placeholder="г. Алматы, ул. Абая, 10" />
      </div>
    </form>`,
    footer: `
      <button class="btn btn-secondary" onclick="Modal.close()">Отмена</button>
      <button class="btn btn-primary" onclick="employeesSave()">Сохранить</button>`,
  });
}

async function employeesEdit(id) {
  const [list, posList] = await Promise.all([api.employees.list(), lookup.positions()]);
  const item = list.find(x => x.id === id);
  if (!item) return;
  Modal.open({
    title: 'Изменить сотрудника',
    body: `<form id="emp-form">
      <div class="form-group">
        <label>ФИО</label>
        <input type="text" name="full_name" value="${item.full_name}" required />
      </div>
      <div class="form-group">
        <label>Должность</label>
        ${buildSelect('position_id', posList, 'id', 'title', item.position_id)}
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Оклад (сом)</label>
          <input type="number" name="salary" value="${item.salary}" min="0" step="0.01" required />
        </div>
        <div class="form-group">
          <label>Телефон</label>
          <input type="tel" name="phone" value="${item.phone || ''}" />
        </div>
      </div>
      <div class="form-group">
        <label>Адрес</label>
        <input type="text" name="address" value="${item.address || ''}" />
      </div>
    </form>`,
    footer: `
      <button class="btn btn-secondary" onclick="Modal.close()">Отмена</button>
      <button class="btn btn-primary" onclick="employeesSave(${id})">Сохранить</button>`,
  });
}

async function employeesSave(id = null) {
  const form = document.getElementById('emp-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const data = readForm(form);
  try {
    if (id) await api.employees.update(id, data);
    else    await api.employees.create(data);
    lookup.clear('employees');
    Modal.close();
    Toast.success('Сохранено');
    await employees();
  } catch(e) { Toast.error(e.message); }
}

async function employeesDelete(id) {
  confirmDelete('сотрудника', async () => {
    try {
      await api.employees.remove(id);
      lookup.clear('employees');
      Toast.success('Удалено');
      await employees();
    } catch(e) { Toast.error(e.message); }
  });
}
