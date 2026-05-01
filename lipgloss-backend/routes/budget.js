const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db/pool');
const { asyncWrap }    = require('../middleware/error');

// GET /api/budget — вернуть текущий бюджет
router.get('/', asyncWrap(async (req, res) => {
  const pool = await getPool();
  const r = await pool.request()
    .query('SELECT TOP 1 * FROM budget ORDER BY id');
  if (!r.recordset.length) return res.json({ id: null, amount: 0 });
  res.json(r.recordset[0]);
}));

// POST /api/budget — установить/обновить бюджет
router.post('/', asyncWrap(async (req, res) => {
  const { amount } = req.body;
  if (amount == null) return res.status(400).json({ message: 'amount обязателен' });
  const pool = await getPool();

  // Проверим, есть ли уже запись
  const check = await pool.request()
    .query('SELECT TOP 1 id FROM budget ORDER BY id');

  let r;
  if (check.recordset.length) {
    // Обновляем
    r = await pool.request()
      .input('id',     sql.Int,   check.recordset[0].id)
      .input('amount', sql.Float, amount)
      .query('UPDATE budget SET amount=@amount OUTPUT INSERTED.* WHERE id=@id');
  } else {
    // Создаём первую запись
    r = await pool.request()
      .input('amount', sql.Float, amount)
      .query('INSERT INTO budget (amount) OUTPUT INSERTED.* VALUES (@amount)');
  }
  res.json(r.recordset[0]);
}));

module.exports = router;