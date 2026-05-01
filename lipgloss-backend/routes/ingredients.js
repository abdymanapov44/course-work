const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db/pool');
const { asyncWrap }    = require('../middleware/error');

router.get('/', asyncWrap(async (req, res) => {
  const pool = await getPool();
  const r = await pool.request()
    .query(`SELECT i.*, p.name AS product_name, m.name AS material_name
            FROM ingredients i
            JOIN products      p ON p.id = i.product_id
            JOIN raw_materials m ON m.id = i.material_id
            ORDER BY i.product_id, i.id`);
  res.json(r.recordset);
}));

// GET /api/ingredients/product/:product_id
router.get('/product/:product_id', asyncWrap(async (req, res) => {
  const pool = await getPool();
  const r = await pool.request()
    .input('pid', sql.Int, req.params.product_id)
    .query(`SELECT i.*, m.name AS material_name
            FROM ingredients i
            JOIN raw_materials m ON m.id = i.material_id
            WHERE i.product_id = @pid
            ORDER BY i.id`);
  res.json(r.recordset);
}));

router.post('/', asyncWrap(async (req, res) => {
  const { product_id, material_id, quantity } = req.body;
  if (!product_id || !material_id || quantity == null)
    return res.status(400).json({ message: 'product_id, material_id, quantity обязательны' });
  const pool = await getPool();
  const r = await pool.request()
    .input('product_id',  sql.Int,   product_id)
    .input('material_id', sql.Int,   material_id)
    .input('quantity',    sql.Float, quantity)
    .query(`INSERT INTO ingredients (product_id, material_id, quantity)
            OUTPUT INSERTED.*
            VALUES (@product_id, @material_id, @quantity)`);
  res.status(201).json(r.recordset[0]);
}));

router.put('/:id', asyncWrap(async (req, res) => {
  const { product_id, material_id, quantity } = req.body;
  const pool = await getPool();
  const r = await pool.request()
    .input('id',          sql.Int,   req.params.id)
    .input('product_id',  sql.Int,   product_id)
    .input('material_id', sql.Int,   material_id)
    .input('quantity',    sql.Float, quantity)
    .query(`UPDATE ingredients
            SET product_id=@product_id, material_id=@material_id, quantity=@quantity
            OUTPUT INSERTED.*
            WHERE id=@id`);
  if (!r.recordset.length) return res.status(404).json({ message: 'Не найдено' });
  res.json(r.recordset[0]);
}));

router.delete('/:id', asyncWrap(async (req, res) => {
  const pool = await getPool();
  await pool.request()
    .input('id', sql.Int, req.params.id)
    .query('DELETE FROM ingredients WHERE id=@id');
  res.json({ message: 'Удалено' });
}));

module.exports = router;