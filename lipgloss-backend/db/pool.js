const sql = require('mssql');
require('dotenv').config();

const config = {
  server:   process.env.DB_SERVER   || 'admin\\SQLEXPRESS',
  database: process.env.DB_DATABASE || 'LipGlossDB',
  user:     process.env.DB_USER     || 'sa',
  password: process.env.DB_PASSWORD || '',
  options: {
    encrypt:              process.env.DB_ENCRYPT    === 'true',
    trustServerCertificate: process.env.DB_TRUST_CERT !== 'false',
    enableArithAbort:     true,
  },
  pool: {
    max: 10,
    min: 0,
    idleTimeoutMillis: 30000,
  },
};

let pool = null;

async function getPool() {
  if (!pool) {
    try {
      pool = await sql.connect(config);
      console.log('✅  SQL Server connected:', config.database);
    } catch (err) {
      pool = null; // сбросить чтобы следующий запрос снова попробовал
      console.error('❌  SQL Server connection error:', err.message);
      console.error('    Server:', config.server, '| Port:', config.port);
      console.error('    DB:', config.database, '| User:', config.user);
      throw new Error('Ошибка подключения к БД: ' + err.message);
    }
  }
  return pool;
}

module.exports = { getPool, sql };