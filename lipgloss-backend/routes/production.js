const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db/pool');
const { asyncWrap }    = require('../middleware/error');

// GET /api/production
router.get('/', asyncWrap(async (req, res) => {
  const pool = await getPool();
  const r = await pool.request().execute('sp_production_list');
  res.json(r.recordset);
}));

// POST /api/production
router.post('/', asyncWrap(async (req, res) => {
  const { product_id, quantity, date, employee_id } = req.body;
  if (!product_id || !quantity || !date || !employee_id)
    return res.status(400).json({ message: 'Все поля обязательны' });

  const pool = await getPool();
  const request = pool.request()
    .input('product_id',  sql.Int,   parseInt(product_id))
    .input('quantity',    sql.Float, parseFloat(quantity))
    .input('date',        sql.Date,  new Date(date))
    .input('employee_id', sql.Int,   parseInt(employee_id))
    .output('result',     sql.Int)
    .output('message',    sql.NVarChar(1000));

  const r = await request.execute('sp_production_create');

  if (r.output.result !== 0) {
    return res.status(400).json({ message: r.output.message });
  }

  res.status(201).json(r.recordset[0]);
}));

// DELETE /api/production/:id
router.delete('/:id', asyncWrap(async (req, res) => {
  const pool = await getPool();
  await pool.request()
    .input('id', sql.Int, req.params.id)
    .execute('sp_production_delete');
  res.json({ message: 'Удалено' });
}));

module.exports = router;
