const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db/pool');
const { asyncWrap }    = require('../middleware/error');

// GET /api/units
router.get('/', asyncWrap(async (req, res) => {
  const pool = await getPool();
  const result = await pool.request().execute('sp_units_list');
  res.json(result.recordset);
}));

// POST /api/units
router.post('/', asyncWrap(async (req, res) => {
  const { name } = req.body;
  if (!name) { return res.status(400).json({ message: 'name обязателен' }); }
  const pool = await getPool();
  const result = await pool.request()
    .input('name', sql.NVarChar(50), name)
    .execute('sp_units_create');
  res.status(201).json(result.recordset[0]);
}));

// PUT /api/units/:id
router.put('/:id', asyncWrap(async (req, res) => {
  const { name } = req.body;
  const pool = await getPool();
  const result = await pool.request()
    .input('id',   sql.Int,          req.params.id)
    .input('name', sql.NVarChar(50), name)
    .execute('sp_units_update');
  if (!result.recordset.length) return res.status(404).json({ message: 'Не найдено' });
  res.json(result.recordset[0]);
}));

// DELETE /api/units/:id
router.delete('/:id', asyncWrap(async (req, res) => {
  const pool = await getPool();
  await pool.request()
    .input('id', sql.Int, req.params.id)
    .execute('sp_units_delete');
  res.json({ message: 'Удалено' });
}));

module.exports = router;
