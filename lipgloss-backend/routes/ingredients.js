const express = require('express');
const router  = express.Router();
const { getPool, sql } = require('../db/pool');
const { asyncWrap }    = require('../middleware/error');

router.get('/', asyncWrap(async (req, res) => {
  const pool = await getPool();
  const r = await pool.request().execute('sp_ingredients_list');
  res.json(r.recordset);
}));

// GET /api/ingredients/product/:product_id
router.get('/product/:product_id', asyncWrap(async (req, res) => {
  const pool = await getPool();
  const r = await pool.request()
    .input('pid', sql.Int, req.params.product_id)
    .execute('sp_ingredients_by_product');
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
    .execute('sp_ingredients_create');
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
    .execute('sp_ingredients_update');
  if (!r.recordset.length) return res.status(404).json({ message: 'Не найдено' });
  res.json(r.recordset[0]);
}));

router.delete('/:id', asyncWrap(async (req, res) => {
  const pool = await getPool();
  await pool.request()
    .input('id', sql.Int, req.params.id)
    .execute('sp_ingredients_delete');
  res.json({ message: 'Удалено' });
}));

module.exports = router;
