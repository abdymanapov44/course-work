async function products() {
  setPage(loadingHTML);
  try {
    const [data, unitsList] = await Promise.all([api.products.list(), lookup.units()]);
    renderProducts(data, unitsList);
  } catch(e) {
    setPage(`<div class="alert alert-danger">${e.message}</div>`);
  }
}

function renderProducts(data, unitsList) {
  const tableHTML = buildTable({
    columns: [
      { key: 'id',       label: 'ID' },
      { key: 'name',     label: 'Наименование' },
      { key: 'unit_id',  label: 'Ед. изм.', render: r => lookup.find(unitsList, r.unit_id) },
      { key: 'quantity', label: 'Кол-во',   render: r => fmt.num(r.quantity) },
      { key: 'amount',   label: 'Сумма',    render: r => fmt.money(r.amount) },
    ],
    rows: data,
    onEdit:   `async function(id){ await productsEdit(id) }`,
    onDelete: `async function(id){ await productsDelete(id) }`,
  });

  setPage(`
    <div class="page-header">
      <div>
        <div class="page-title">Готовая продукция</div>
        <div class="page-subtitle">Виды блеск для губ и их складские остатки</div>
      </div>
      <button class="btn btn-primary" onclick="productsCreate()">+ Добавить</button>
    </div>
    <div class="table-card">${tableHTML}</div>
  `);
}

async function productsCreate() {
  const unitsList = await lookup.units();
  Modal.open({
    title: 'Добавить продукцию',
    body: `<form id="prod-form">
      <div class="form-group">
        <label>Наименование</label>
        <input type="text" name="name" placeholder="например: Блеск прозрачный" required />
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
          <label>Сумма (₸)</label>
          <input type="number" name="amount" value="0" min="0" step="0.01" required />
        </div>
      </div>
    </form>`,
    footer: `
      <button class="btn btn-secondary" onclick="Modal.close()">Отмена</button>
      <button class="btn btn-primary" onclick="productsSave()">Сохранить</button>`,
  });
}

async function productsEdit(id) {
  const [list, unitsList] = await Promise.all([api.products.list(), lookup.units()]);
  const item = list.find(x => x.id === id);
  if (!item) return;
  Modal.open({
    title: 'Изменить продукцию',
    body: `<form id="prod-form">
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
          <label>Сумма (₸)</label>
          <input type="number" name="amount" value="${item.amount}" min="0" step="0.01" required />
        </div>
      </div>
    </form>`,
    footer: `
      <button class="btn btn-secondary" onclick="Modal.close()">Отмена</button>
      <button class="btn btn-primary" onclick="productsSave(${id})">Сохранить</button>`,
  });
}

async function productsSave(id = null) {
  const form = document.getElementById('prod-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const data = readForm(form);
  try {
    if (id) await api.products.update(id, data);
    else    await api.products.create(data);
    lookup.clear('products');
    Modal.close();
    Toast.success('Сохранено');
    await products();
  } catch(e) { Toast.error(e.message); }
}

async function productsDelete(id) {
  confirmDelete('продукцию', async () => {
    try {
      await api.products.remove(id);
      lookup.clear('products');
      Toast.success('Удалено');
      await products();
    } catch(e) { Toast.error(e.message); }
  });
}
