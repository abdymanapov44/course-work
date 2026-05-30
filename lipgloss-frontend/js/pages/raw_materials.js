async function raw_materials() {
  setPage(loadingHTML);
  try {
    const [data, unitsList] = await Promise.all([api.rawMaterials.list(), lookup.units()]);
    renderRawMaterials(data, unitsList);
  } catch(e) {
    setPage(`<div class="alert alert-danger">${e.message}</div>`);
  }
}

function renderRawMaterials(data, unitsList) {
  const tableHTML = buildTable({
    columns: [
      { key: 'id',   label: 'ID' },
      { key: 'name', label: 'Наименование' },
      { key: 'unit_id', label: 'Ед. изм.', render: r => lookup.find(unitsList, r.unit_id) },
      { key: 'quantity', label: 'Кол-во', render: r => fmt.num(r.quantity) },
      { key: 'amount',   label: 'Сумма',  render: r => fmt.money(r.amount) },
    ],
    rows: data,
    onEdit:   `async function(id){ await rawMaterialsEdit(id) }`,
    onDelete: `async function(id){ await rawMaterialsDelete(id) }`,
  });

  setPage(`
    <div class="page-header">
      <div>
        <div class="page-title">Сырьё</div>
        <div class="page-subtitle">Склад сырья для производства блеск для губ</div>
      </div>
      <button class="btn btn-primary" onclick="rawMaterialsCreate()">+ Добавить</button>
    </div>
    <div class="table-card">${tableHTML}</div>
  `);
}

async function rawMaterialsCreate() {
  const unitsList = await lookup.units();
  Modal.open({
    title: 'Добавить сырьё',
    body: `<form id="rm-form">
      <div class="form-group">
        <label>Наименование</label>
        <input type="text" name="name" placeholder="например: Касторовое масло" required />
      </div>
      <div class="form-group">
        <label>Единица измерения</label>
        ${buildSelect('unit_id', unitsList, 'id', 'name')}
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Количество</label>
          <input type="number" name="quantity" value="0" min="0" step="0.001" required />
        </div>
        <div class="form-group">
          <label>Сумма (сом)</label>
          <input type="number" name="amount" value="0" min="0" step="0.01" required />
        </div>
      </div>
    </form>`,
    footer: `
      <button class="btn btn-secondary" onclick="Modal.close()">Отмена</button>
      <button class="btn btn-primary" onclick="rawMaterialsSave()">Сохранить</button>`,
  });
}

async function rawMaterialsEdit(id) {
  const [list, unitsList] = await Promise.all([api.rawMaterials.list(), lookup.units()]);
  const item = list.find(x => x.id === id);
  if (!item) return;
  Modal.open({
    title: 'Изменить сырьё',
    body: `<form id="rm-form">
      <div class="form-group">
        <label>Наименование</label>
        <input type="text" name="name" value="${item.name}" required />
      </div>
      <div class="form-group">
        <label>Единица измерения</label>
        ${buildSelect('unit_id', unitsList, 'id', 'name', item.unit_id)}
      </div>
      <div class="form-row">
        <div class="form-group">
          <label>Количество</label>
          <input type="number" name="quantity" value="${item.quantity}" min="0" step="0.001" required />
        </div>
        <div class="form-group">
          <label>Сумма (сом)</label>
          <input type="number" name="amount" value="${item.amount}" min="0" step="0.01" required />
        </div>
      </div>
    </form>`,
    footer: `
      <button class="btn btn-secondary" onclick="Modal.close()">Отмена</button>
      <button class="btn btn-primary" onclick="rawMaterialsSave(${id})">Сохранить</button>`,
  });
}

async function rawMaterialsSave(id = null) {
  const form = document.getElementById('rm-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const data = readForm(form);
  try {
    if (id) await api.rawMaterials.update(id, data);
    else    await api.rawMaterials.create(data);
    lookup.clear('materials');
    Modal.close();
    Toast.success('Сохранено');
    await raw_materials();
  } catch(e) { Toast.error(e.message); }
}

async function rawMaterialsDelete(id) {
  confirmDelete('сырьё', async () => {
    try {
      await api.rawMaterials.remove(id);
      lookup.clear('materials');
      Toast.success('Удалено');
      await raw_materials();
    } catch(e) { Toast.error(e.message); }
  });
}
