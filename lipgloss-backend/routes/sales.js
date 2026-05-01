const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db/pool');
const { asyncWrap }    = require('../middleware/error');

// GET /api/sales
router.get('/', asyncWrap(async (req, res) => {
  const pool = await getPool();
  const r = await pool.request()
    .query(`SELECT s.*, p.name AS product_name, e.full_name AS employee_name
            FROM sales s
            JOIN products  p ON p.id = s.product_id
            JOIN employees e ON e.id = s.employee_id
            ORDER BY s.date DESC, s.id DESC`);
  res.json(r.recordset);
}));

// POST /api/sales
// Триггер trg_after_sale автоматически:
//   - уменьшает склад готовой продукции
//   - пополняет бюджет
router.post('/', asyncWrap(async (req, res) => {
  const { product_id, quantity, amount, date, employee_id } = req.body;
  if (!product_id || !quantity || !amount || !date || !employee_id)
    return res.status(400).json({ message: 'Все поля обязательны' });

  const pool = await getPool();

  // Проверим остаток на складе
  const stockCheck = await pool.request()
    .input('pid', sql.Int,   parseInt(product_id))
    .input('qty', sql.Float, parseFloat(quantity))
    .query('SELECT quantity FROM products WHERE id=@pid');

  if (!stockCheck.recordset.length)
    return res.status(404).json({ message: 'Продукция не найдена' });

  const stock = stockCheck.recordset[0].quantity;
  if (stock < parseFloat(quantity))
    return res.status(400).json({
      message: `Недостаточно продукции на складе. Есть: ${stock}, нужно: ${quantity}`
    });

  const r = await pool.request()
    .input('product_id',  sql.Int,   parseInt(product_id))
    .input('quantity',    sql.Float, parseFloat(quantity))
    .input('amount',      sql.Float, parseFloat(amount))
    .input('date',        sql.Date,  new Date(date))
    .input('employee_id', sql.Int,   parseInt(employee_id))
    .query(`INSERT INTO sales (product_id, quantity, amount, date, employee_id)
            OUTPUT INSERTED.*
            VALUES (@product_id, @quantity, @amount, @date, @employee_id)`);

  res.status(201).json(r.recordset[0]);
}));

// DELETE /api/sales/:id
router.delete('/:id', asyncWrap(async (req, res) => {
  const pool = await getPool();
  await pool.request()
    .input('id', sql.Int, req.params.id)
    .query('DELETE FROM sales WHERE id=@id');
  res.json({ message: 'Удалено' });
}));

module.exports = router;