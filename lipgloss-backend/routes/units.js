const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db/pool');
const { asyncWrap }    = require('../middleware/error');

// GET /api/units
router.get('/', asyncWrap(async (req, res) => {
  const pool   = await getPool();
  const result = await pool.request().query('SELECT * FROM units ORDER BY id');
  res.json(result.recordset);
}));

// POST /api/units
router.post('/', asyncWrap(async (req, res) => {
  const { name } = req.body;
  if (!name) { return res.status(400).json({ message: 'name обязателен' }); }
  const pool   = await getPool();
  const result = await pool.request()
    .input('name', sql.NVarChar(50), name)
    .query('INSERT INTO units (name) OUTPUT INSERTED.* VALUES (@name)');
  res.status(201).json(result.recordset[0]);
}));

// PUT /api/units/:id
router.put('/:id', asyncWrap(async (req, res) => {
  const { name } = req.body;
  const pool = await getPool();
  const result = await pool.request()
    .input('id',   sql.Int,          req.params.id)
    .input('name', sql.NVarChar(50), name)
    .query('UPDATE units SET name=@name OUTPUT INSERTED.* WHERE id=@id');
  if (!result.recordset.length) return res.status(404).json({ message: 'Не найдено' });
  res.json(result.recordset[0]);
}));

// DELETE /api/units/:id
router.delete('/:id', asyncWrap(async (req, res) => {
  const pool = await getPool();
  await pool.request()
    .input('id', sql.Int, req.params.id)
    .query('DELETE FROM units WHERE id=@id');
  res.json({ message: 'Удалено' });
}));

module.exports = router;