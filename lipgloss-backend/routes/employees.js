const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db/pool');
const { asyncWrap }    = require('../middleware/error');

router.get('/', asyncWrap(async (req, res) => {
  const pool = await getPool();
  const r = await pool.request().execute('sp_employees_list');
  res.json(r.recordset);
}));

router.post('/', asyncWrap(async (req, res) => {
  const { full_name, position_id, salary = 0, address = '', phone = '' } = req.body;
  if (!full_name || !position_id) return res.status(400).json({ message: 'full_name и position_id обязательны' });
  const pool = await getPool();
  const r = await pool.request()
    .input('full_name',   sql.NVarChar(200), full_name)
    .input('position_id', sql.Int,           position_id)
    .input('salary',      sql.Float,         salary)
    .input('address',     sql.NVarChar(255), address)
    .input('phone',       sql.NVarChar(50),  phone)
    .execute('sp_employees_create');
  res.status(201).json(r.recordset[0]);
}));

router.put('/:id', asyncWrap(async (req, res) => {
  const { full_name, position_id, salary, address, phone } = req.body;
  const pool = await getPool();
  const r = await pool.request()
    .input('id',          sql.Int,           req.params.id)
    .input('full_name',   sql.NVarChar(200), full_name)
    .input('position_id', sql.Int,           position_id)
    .input('salary',      sql.Float,         salary)
    .input('address',     sql.NVarChar(255), address || '')
    .input('phone',       sql.NVarChar(50),  phone   || '')
    .execute('sp_employees_update');
  if (!r.recordset.length) return res.status(404).json({ message: 'Не найдено' });
  res.json(r.recordset[0]);
}));

router.delete('/:id', asyncWrap(async (req, res) => {
  const pool = await getPool();
  await pool.request()
    .input('id', sql.Int, req.params.id)
    .execute('sp_employees_delete');
  res.json({ message: 'Удалено' });
}));

module.exports = router;
