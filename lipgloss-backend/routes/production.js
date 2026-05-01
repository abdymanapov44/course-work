const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db/pool');
const { asyncWrap }    = require('../middleware/error');

// GET /api/production
router.get('/', asyncWrap(async (req, res) => {
  const pool = await getPool();
  const r = await pool.request()
    .query(`SELECT pr.*, p.name AS product_name, e.full_name AS employee_name
            FROM production pr
            JOIN products  p ON p.id = pr.product_id
            JOIN employees e ON e.id = pr.employee_id
            ORDER BY pr.date DESC, pr.id DESC`);
  res.json(r.recordset);
}));

// POST /api/production
// Триггер trg_after_production автоматически:
//   - списывает сырьё по ингредиентам
//   - пополняет склад готовой продукции
router.post('/', asyncWrap(async (req, res) => {
  const { product_id, quantity, date, employee_id } = req.body;
  if (!product_id || !quantity || !date || !employee_id)
    return res.status(400).json({ message: 'Все поля обязательны' });

  const pool = await getPool();

  // Проверим наличие ингредиентов у продукта
  const ingCheck = await pool.request()
    .input('pid', sql.Int, parseInt(product_id))
    .query('SELECT COUNT(*) AS cnt FROM ingredients WHERE product_id=@pid');

  if (ingCheck.recordset[0].cnt === 0)
    return res.status(400).json({ message: 'У данной продукции не заданы ингредиенты' });

  // Проверим достаточность сырья на складе
  const stockCheck = await pool.request()
    .input('pid', sql.Int, parseInt(product_id))
    .input('qty', sql.Float, parseFloat(quantity))
    .query(`
      SELECT m.name, m.quantity AS stock,
             ing.quantity * @qty AS needed
      FROM ingredients ing
      JOIN raw_materials m ON m.id = ing.material_id
      WHERE ing.product_id = @pid
        AND m.quantity < ing.quantity * @qty
    `);

  if (stockCheck.recordset.length > 0) {
    const short = stockCheck.recordset
      .map(r => `${r.name}: нужно ${r.needed.toFixed(3)}, есть ${r.stock.toFixed(3)}`)
      .join('; ');
    return res.status(400).json({ message: `Недостаточно сырья: ${short}` });
  }

  const r = await pool.request()
    .input('product_id',  sql.Int,   parseInt(product_id))
    .input('quantity',    sql.Float, parseFloat(quantity))
    .input('date',        sql.Date,  new Date(date))
    .input('employee_id', sql.Int,   parseInt(employee_id))
    .query(`INSERT INTO production (product_id, quantity, date, employee_id)
            OUTPUT INSERTED.*
            VALUES (@product_id, @quantity, @date, @employee_id)`);

  res.status(201).json(r.recordset[0]);
}));

// DELETE /api/production/:id
router.delete('/:id', asyncWrap(async (req, res) => {
  const pool = await getPool();
  await pool.request()
    .input('id', sql.Int, req.params.id)
    .query('DELETE FROM production WHERE id=@id');
  res.json({ message: 'Удалено' });
}));

module.exports = router;