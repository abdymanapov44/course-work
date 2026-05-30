const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db/pool');
const { asyncWrap }    = require('../middleware/error');

// GET /api/reports/purchases?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/purchases', asyncWrap(async (req, res) => {
  const { from, to } = req.query;
  const pool = await getPool();
  const r = await pool.request()
    .input('from', sql.Date, from ? new Date(from) : null)
    .input('to',   sql.Date, to ? new Date(to) : null)
    .execute('sp_reports_purchases');

  res.json(r.recordset);
}));

// GET /api/reports/sales?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/sales', asyncWrap(async (req, res) => {
  const { from, to } = req.query;
  const pool = await getPool();
  const r = await pool.request()
    .input('from', sql.Date, from ? new Date(from) : null)
    .input('to',   sql.Date, to ? new Date(to) : null)
    .execute('sp_reports_sales');

  res.json(r.recordset);
}));

module.exports = router;
