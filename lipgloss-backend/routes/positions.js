const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db/pool');
const { asyncWrap }    = require('../middleware/error');

router.get('/', asyncWrap(async (req, res) => {
  const pool = await getPool();
  const r = await pool.request().execute('sp_positions_list');
  res.json(r.recordset);
}));

router.post('/', asyncWrap(async (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ message: 'title обязателен' });
  const pool = await getPool();
  const r = await pool.request()
    .input('title', sql.NVarChar(100), title)
    .execute('sp_positions_create');
  res.status(201).json(r.recordset[0]);
}));

router.put('/:id', asyncWrap(async (req, res) => {
  const { title } = req.body;
  const pool = await getPool();
  const r = await pool.request()
    .input('id',    sql.Int,           req.params.id)
    .input('title', sql.NVarChar(100), title)
    .execute('sp_positions_update');
  if (!r.recordset.length) return res.status(404).json({ message: 'Не найдено' });
  res.json(r.recordset[0]);
}));

router.delete('/:id', asyncWrap(async (req, res) => {
  const pool = await getPool();
  await pool.request()
    .input('id', sql.Int, req.params.id)
    .execute('sp_positions_delete');
  res.json({ message: 'Удалено' });
}));

module.exports = router;
