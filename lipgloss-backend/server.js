require('dotenv').config();
const express = require('express');
const cors    = require('cors');
const { errorHandler } = require('./middleware/error');

const app = express();

// ── Middleware ──────────────────────────────────────────────
app.use(cors({
  origin: '*',     // в продакшне укажи конкретный origin фронтенда
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Логирование запросов ────────────────────────────────────
app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path}`);
  next();
});

// ── Роуты ──────────────────────────────────────────────────
app.use('/api/units',         require('./routes/units'));
app.use('/api/positions',     require('./routes/positions'));
app.use('/api/raw-materials', require('./routes/raw_materials'));
app.use('/api/products',      require('./routes/products'));
app.use('/api/employees',     require('./routes/employees'));
app.use('/api/ingredients',   require('./routes/ingredients'));
app.use('/api/budget',        require('./routes/budget'));
app.use('/api/purchases',     require('./routes/purchases'));
app.use('/api/production',    require('./routes/production'));
app.use('/api/sales',         require('./routes/sales'));
app.use('/api/reports',       require('./routes/reports'));

// ── Health-check ────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ── DB диагностика ───────────────────────────────────────────
app.get('/api/db-check', async (req, res) => {
  const { getPool } = require('./db/pool');
  try {
    const pool = await getPool();
    const r = await pool.request().query('SELECT DB_NAME() AS db, GETDATE() AS now');
    res.json({ status: 'connected', db: r.recordset[0].db, time: r.recordset[0].now });
  } catch (err) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

// ── 404 ─────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Маршрут ${req.path} не найден` });
});

// ── Централизованная обработка ошибок ───────────────────────
app.use(errorHandler);

// ── Старт ───────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀  LipGloss API запущен: http://localhost:${PORT}`);
  console.log(`📋  Health-check:         http://localhost:${PORT}/api/health`);
});