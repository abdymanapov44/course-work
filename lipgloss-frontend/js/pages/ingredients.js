async function ingredients() {
  setPage(loadingHTML);
  try {
    const [data, prodList, matList] = await Promise.all([
      api.ingredients.list(),
      lookup.products(),
      lookup.materials(),
    ]);
    renderIngredients(data, prodList, matList);
  } catch(e) {
    setPage(`<div class="alert alert-danger">${e.message}</div>`);
  }
}

function renderIngredients(data, prodList, matList) {
  const tableHTML = buildTable({
    columns: [
      { key: 'id',          label: 'ID' },
      { key: 'product_id',  label: 'Продукция', render: r => lookup.find(prodList, r.product_id) },
      { key: 'material_id', label: 'Сырьё',     render: r => lookup.find(matList, r.material_id) },
      { key: 'quantity',    label: 'Кол-во на ед. продукта', render: r => fmt.num(r.quantity) },
    ],
    rows: data,
    onEdit:   `async function(id){ await ingredientsEdit(id) }`,
    onDelete: `async function(id){ await ingredientsDelete(id) }`,
  });

  setPage(`
    <div class="page-header">
      <div>
        <div class="page-title">Ингредиенты</div>
        <div class="page-subtitle">Состав каждого вида продукции (сырьё на единицу)</div>
      </div>
      <button class="btn btn-primary" onclick="ingredientsCreate()">+ Добавить</button>
    </div>
    <div class="table-card">${tableHTML}</div>
  `);
}

async function ingredientsCreate() {
  const [prodList, matList] = await Promise.all([lookup.products(), lookup.materials()]);
  Modal.open({
    title: 'Добавить ингредиент',
    body: `<form id="ing-form">
      <div class="form-group">
        <label>Продукция</label>
        ${buildSelect('product_id', prodList, 'id', 'name')}
      </div>
      <div class="form-group">
        <label>Сырьё</label>
        ${buildSelect('material_id', matList, 'id', 'name')}
      </div>
      <div class="form-group">
        <label>Количество на единицу продукта</label>
        <input type="number" name="quantity" placeholder="0.300" min="0" step="0.001" required />
        <div class="form-hint">Сколько единиц сырья нужно для производства 1 единицы продукта</div>
      </div>
    </form>`,
    footer: `
      <button class="btn btn-secondary" onclick="Modal.close()">Отмена</button>
      <button class="btn btn-primary" onclick="ingredientsSave()">Сохранить</button>`,
  });
}

async function ingredientsEdit(id) {
  const [list, prodList, matList] = await Promise.all([
    api.ingredients.list(),
    lookup.products(),
    lookup.materials(),
  ]);
  const item = list.find(x => x.id === id);
  if (!item) return;
  Modal.open({
    title: 'Изменить ингредиент',
    body: `<form id="ing-form">
      <div class="form-group">
        <label>Продукция</label>
        ${buildSelect('product_id', prodList, 'id', 'name', item.product_id)}
      </div>
      <div class="form-group">
        <label>Сырьё</label>
        ${buildSelect('material_id', matList, 'id', 'name', item.material_id)}
      </div>
      <div class="form-group">
        <label>Количество на единицу продукта</label>
        <input type="number" name="quantity" value="${item.quantity}" min="0" step="0.001" required />
      </div>
    </form>`,
    footer: `
      <button class="btn btn-secondary" onclick="Modal.close()">Отмена</button>
      <button class="btn btn-primary" onclick="ingredientsSave(${id})">Сохранить</button>`,
  });
}

async function ingredientsSave(id = null) {
  const form = document.getElementById('ing-form');
  if (!form.checkValidity()) { form.reportValidity(); return; }
  const data = readForm(form);
  try {
    if (id) await api.ingredients.update(id, data);
    else    await api.ingredients.create(data);
    Modal.close();
    Toast.success('Сохранено');
    await ingredients();
  } catch(e) { Toast.error(e.message); }
}

async function ingredientsDelete(id) {
  confirmDelete('ингредиент', async () => {
    try {
      await api.ingredients.remove(id);
      Toast.success('Удалено');
      await ingredients();
    } catch(e) { Toast.error(e.message); }
  });
}
