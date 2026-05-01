const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db/pool');
const { asyncWrap }    = require('../middleware/error');

// GET /api/purchases
router.get('/', asyncWrap(async (req, res) => {
  const pool = await getPool();
  const r = await pool.request()
    .query(`SELECT p.*, m.name AS material_name, e.full_name AS employee_name
            FROM purchases p
            JOIN raw_materials m ON m.id = p.material_id
            JOIN employees     e ON e.id = p.employee_id
            ORDER BY p.date DESC, p.id DESC`);
  res.json(r.recordset);
}));

// POST /api/purchases — вызов хранимой процедуры sp_check_and_purchase
router.post('/', asyncWrap(async (req, res) => {
  const { material_id, quantity, amount, date, employee_id } = req.body;

  if (!material_id || !quantity || !amount || !date || !employee_id)
    return res.status(400).json({ message: 'Все поля обязательны' });

  const pool    = await getPool();
  const request = pool.request();

  // Входные параметры
  request.input('amount',      sql.Float,  parseFloat(amount));
  request.input('material_id', sql.Int,    parseInt(material_id));
  request.input('quantity',    sql.Float,  parseFloat(quantity));
  request.input('date',        sql.Date,   new Date(date));
  request.input('employee_id', sql.Int,    parseInt(employee_id));

  // Выходной параметр: 0 = OK, 1 = недостаточно средств
  request.output('result', sql.Int);

  const r = await request.execute('sp_check_and_purchase');
  const result = r.output.result;

  if (result === 1) {
    return res.status(400).json({
      message: 'Недостаточно средств в бюджете для данной закупки'
    });
  }

  // Вернём последнюю добавленную запись
  const last = await pool.request()
    .query(`SELECT TOP 1 p.*, m.name AS material_name, e.full_name AS employee_name
            FROM purchases p
            JOIN raw_materials m ON m.id = p.material_id
            JOIN employees     e ON e.id = p.employee_id
            ORDER BY p.id DESC`);

  res.status(201).json(last.recordset[0]);
}));

// DELETE /api/purchases/:id
router.delete('/:id', asyncWrap(async (req, res) => {
  const pool = await getPool();
  await pool.request()
    .input('id', sql.Int, req.params.id)
    .query('DELETE FROM purchases WHERE id=@id');
  res.json({ message: 'Удалено' });
}));

module.exports = router;