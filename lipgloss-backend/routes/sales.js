const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db/pool');
const { asyncWrap }    = require('../middleware/error');

// GET /api/sales
router.get('/', asyncWrap(async (req, res) => {
  const pool = await getPool();
  const r = await pool.request().execute('sp_sales_list');
  res.json(r.recordset);
}));

// POST /api/sales
router.post('/', asyncWrap(async (req, res) => {
  const { product_id, quantity, amount, date, employee_id } = req.body;
  if (!product_id || !quantity || !amount || !date || !employee_id)
    return res.status(400).json({ message: 'Все поля обязательны' });

  const pool = await getPool();
  const request = pool.request()
    .input('product_id',  sql.Int,   parseInt(product_id))
    .input('quantity',    sql.Float, parseFloat(quantity))
    .input('amount',      sql.Float, parseFloat(amount))
    .input('date',        sql.Date,  new Date(date))
    .input('employee_id', sql.Int,   parseInt(employee_id))
    .output('result',     sql.Int)
    .output('message',    sql.NVarChar(1000));

  const r = await request.execute('sp_sales_create');

  if (r.output.result === 1) {
    return res.status(404).json({ message: r.output.message });
  }

  if (r.output.result !== 0) {
    return res.status(400).json({ message: r.output.message });
  }

  res.status(201).json(r.recordset[0]);
}));

// DELETE /api/sales/:id
router.delete('/:id', asyncWrap(async (req, res) => {
  const pool = await getPool();
  await pool.request()
    .input('id', sql.Int, req.params.id)
    .execute('sp_sales_delete');
  res.json({ message: 'Удалено' });
}));

module.exports = router;
