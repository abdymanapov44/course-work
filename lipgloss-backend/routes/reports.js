const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db/pool');
const { asyncWrap }    = require('../middleware/error');

// GET /api/reports/purchases?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/purchases', asyncWrap(async (req, res) => {
  const { from, to } = req.query;
  const pool = await getPool();

  const request = pool.request();
  let whereClause = '';

  if (from && to) {
    request.input('from', sql.Date, new Date(from));
    request.input('to',   sql.Date, new Date(to));
    whereClause = 'WHERE p.date BETWEEN @from AND @to';
  } else if (from) {
    request.input('from', sql.Date, new Date(from));
    whereClause = 'WHERE p.date >= @from';
  } else if (to) {
    request.input('to', sql.Date, new Date(to));
    whereClause = 'WHERE p.date <= @to';
  }

  const r = await request.query(`
    SELECT p.*, m.name AS material_name, e.full_name AS employee_name
    FROM purchases p
    JOIN raw_materials m ON m.id = p.material_id
    JOIN employees     e ON e.id = p.employee_id
    ${whereClause}
    ORDER BY p.date DESC, p.id DESC
  `);

  res.json(r.recordset);
}));

// GET /api/reports/sales?from=YYYY-MM-DD&to=YYYY-MM-DD
router.get('/sales', asyncWrap(async (req, res) => {
  const { from, to } = req.query;
  const pool = await getPool();

  const request = pool.request();
  let whereClause = '';

  if (from && to) {
    request.input('from', sql.Date, new Date(from));
    request.input('to',   sql.Date, new Date(to));
    whereClause = 'WHERE s.date BETWEEN @from AND @to';
  } else if (from) {
    request.input('from', sql.Date, new Date(from));
    whereClause = 'WHERE s.date >= @from';
  } else if (to) {
    request.input('to', sql.Date, new Date(to));
    whereClause = 'WHERE s.date <= @to';
  }

  const r = await request.query(`
    SELECT s.*, p.name AS product_name, e.full_name AS employee_name
    FROM sales s
    JOIN products  p ON p.id = s.product_id
    JOIN employees e ON e.id = s.employee_id
    ${whereClause}
    ORDER BY s.date DESC, s.id DESC
  `);

  res.json(r.recordset);
}));

module.exports = router;