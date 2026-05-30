const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db/pool');
const { asyncWrap }    = require('../middleware/error');

// GET /api/budget
router.get('/', asyncWrap(async (req, res) => {
  const pool = await getPool();
  const r = await pool.request().execute('sp_budget_get');
  res.json(r.recordset[0] || { id: null, amount: 0 });
}));

// POST /api/budget
router.post('/', asyncWrap(async (req, res) => {
  const { amount } = req.body;
  if (amount == null) return res.status(400).json({ message: 'amount обязателен' });
  const pool = await getPool();
  const r = await pool.request()
    .input('amount', sql.Float, amount)
    .execute('sp_budget_set');
  res.json(r.recordset[0]);
}));

module.exports = router;
