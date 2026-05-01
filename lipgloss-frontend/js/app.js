const pages = {
  dashboard,
  raw_materials,
  products,
  units,
  positions,
  employees,
  ingredients,
  budget,
  purchases,
  production,
  sales,
  report_purchases: () => reports('purchases'),
  report_sales:     () => reports('sales'),
};

let currentPage = 'dashboard';

function navigate(name) {
  currentPage = name;

  // update nav active state
  document.querySelectorAll('.nav-item').forEach(el => {
    el.classList.toggle('active', el.dataset.page === name);
  });

  // render page
  const render = pages[name];
  if (render) render();
  else setPage(`<p style="color:var(--ink-soft);padding:40px">Страница не найдена.</p>`);
}

// Nav clicks
document.querySelectorAll('.nav-item').forEach(el => {
  el.addEventListener('click', e => {
    e.preventDefault();
    navigate(el.dataset.page);
  });
});

// Init
refreshBudget();
navigate('dashboard');
