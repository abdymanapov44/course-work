const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db/pool');
const { asyncWrap }    = require('../middleware/error');

router.get('/', asyncWrap(async (req, res) => {
  const pool = await getPool();
  const r = await pool.request()
    .query('SELECT * FROM products ORDER BY id');
  res.json(r.recordset);
}));

router.post('/', asyncWrap(async (req, res) => {
  const { name, unit_id, quantity = 0, amount = 0 } = req.body;
  if (!name || !unit_id) return res.status(400).json({ message: 'name и unit_id обязательны' });
  const pool = await getPool();
  const r = await pool.request()
    .input('name',     sql.NVarChar(150), name)
    .input('unit_id',  sql.Int,           unit_id)
    .input('quantity', sql.Float,         quantity)
    .input('amount',   sql.Float,         amount)
    .query(`INSERT INTO products (name, unit_id, quantity, amount)
            OUTPUT INSERTED.*
            VALUES (@name, @unit_id, @quantity, @amount)`);
  res.status(201).json(r.recordset[0]);
}));

router.put('/:id', asyncWrap(async (req, res) => {
  const { name, unit_id, quantity, amount } = req.body;
  const pool = await getPool();
  const r = await pool.request()
    .input('id',       sql.Int,           req.params.id)
    .input('name',     sql.NVarChar(150), name)
    .input('unit_id',  sql.Int,           unit_id)
    .input('quantity', sql.Float,         quantity)
    .input('amount',   sql.Float,         amount)
    .query(`UPDATE products
            SET name=@name, unit_id=@unit_id, quantity=@quantity, amount=@amount
            OUTPUT INSERTED.*
            WHERE id=@id`);
  if (!r.recordset.length) return res.status(404).json({ message: 'Не найдено' });
  res.json(r.recordset[0]);
}));

router.delete('/:id', asyncWrap(async (req, res) => {
  const pool = await getPool();
  await pool.request()
    .input('id', sql.Int, req.params.id)
    .query('DELETE FROM products WHERE id=@id');
  res.json({ message: 'Удалено' });
}));

module.exports = router;