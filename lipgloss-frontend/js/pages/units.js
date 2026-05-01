async function units() {
  setPage(loadingHTML);
  try {
    const data = await api.units.list();
    renderUnitsPage(data);
  } catch(e) {
    setPage(`<div class="alert alert-danger">${e.message}</div>`);
  }
}

function renderUnitsPage(data) {
  const tableHTML = buildTable({
    columns: [
      { key: 'id',   label: 'ID' },
      { key: 'name', label: 'Наименование' },
    ],
    rows: data,
    onEdit:   `async function(id){ await unitsEdit(id) }`,
    onDelete: `async function(id){ await unitsDelete(id) }`,
  });

  setPage(`
    <div class="page-header">
      <div>
        <div class="page-title">Единицы измерения</div>
        <div class="page-subtitle">кг, л, мл, шт. и др.</div>
      </div>
      <button class="btn btn-primary" onclick="unitsCreate()">+ Добавить</button>
    </div>
    <div class="table-card">${tableHTML}</div>
  `);
}

function unitsCreate() {
  Modal.open({
    title: 'Добавить единицу измерения',
    body: `<form id="unit-form">
      <div class="form-group">
        <label>Наименование</label>
        <input type="text" name="name" placeholder="например: кг" required />
      </div>
    </form>`,
    footer: `
      <button class="btn btn-secondary" onclick="Modal.close()">Отмена</button>
      <button class="btn btn-primary" onclick="unitsSave()">Сохранить</button>`,
  });
}

async function unitsEdit(id) {
  const list = await api.units.list();
  const item = list.find(x => x.id === id);
  if (!item) return;
  Modal.open({
    title: 'Изменить единицу измерения',
    body: `<form id="unit-form">
      <div class="form-group">
        <label>Наименование</label>
        <input type="text" name="name" value="${item.name}" required />
      </div>
    </form>`,
    footer: `
      <button class="btn btn-secondary" onclick="Modal.close()">Отмена</button>
      <button class="btn btn-primary" onclick="unitsSave(${id})">Сохранить</button>`,
  });
}

async function unitsSave(id = null) {
  const form = document.getElementById('unit-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const data = readForm(form);
  try {
    if (id) await api.units.update(id, data);
    else    await api.units.create(data);
    lookup.clear('units');
    Modal.close();
    Toast.success('Сохранено');
    await units();
  } catch(e) { Toast.error(e.message); }
}

async function unitsDelete(id) {
  confirmDelete('единицу измерения', async () => {
    try {
      await api.units.remove(id);
      lookup.clear('units');
      Toast.success('Удалено');
      await units();
    } catch(e) { Toast.error(e.message); }
  });
}
