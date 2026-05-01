async function positions() {
  setPage(loadingHTML);
  try {
    const data = await api.positions.list();
    renderPositionsPage(data);
  } catch(e) {
    setPage(`<div class="alert alert-danger">${e.message}</div>`);
  }
}

function renderPositionsPage(data) {
  const tableHTML = buildTable({
    columns: [
      { key: 'id',    label: 'ID' },
      { key: 'title', label: 'Должность' },
    ],
    rows: data,
    onEdit:   `async function(id){ await positionsEdit(id) }`,
    onDelete: `async function(id){ await positionsDelete(id) }`,
  });

  setPage(`
    <div class="page-header">
      <div>
        <div class="page-title">Должности</div>
        <div class="page-subtitle">Справочник должностей сотрудников</div>
      </div>
      <button class="btn btn-primary" onclick="positionsCreate()">+ Добавить</button>
    </div>
    <div class="table-card">${tableHTML}</div>
  `);
}

function positionsCreate() {
  Modal.open({
    title: 'Добавить должность',
    body: `<form id="pos-form">
      <div class="form-group">
        <label>Название должности</label>
        <input type="text" name="title" placeholder="например: Технолог" required />
      </div>
    </form>`,
    footer: `
      <button class="btn btn-secondary" onclick="Modal.close()">Отмена</button>
      <button class="btn btn-primary" onclick="positionsSave()">Сохранить</button>`,
  });
}

async function positionsEdit(id) {
  const list = await api.positions.list();
  const item = list.find(x => x.id === id);
  if (!item) return;
  Modal.open({
    title: 'Изменить должность',
    body: `<form id="pos-form">
      <div class="form-group">
        <label>Название должности</label>
        <input type="text" name="title" value="${item.title}" required />
      </div>
    </form>`,
    footer: `
      <button class="btn btn-secondary" onclick="Modal.close()">Отмена</button>
      <button class="btn btn-primary" onclick="positionsSave(${id})">Сохранить</button>`,
  });
}

async function positionsSave(id = null) {
  const form = document.getElementById('pos-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const data = readForm(form);
  try {
    if (id) await api.positions.update(id, data);
    else    await api.positions.create(data);
    lookup.clear('positions');
    Modal.close();
    Toast.success('Сохранено');
    await positions();
  } catch(e) { Toast.error(e.message); }
}

async function positionsDelete(id) {
  confirmDelete('должность', async () => {
    try {
      await api.positions.remove(id);
      lookup.clear('positions');
      Toast.success('Удалено');
      await positions();
    } catch(e) { Toast.error(e.message); }
  });
}
