function errorHandler(err, req, res, next) {
  console.error('❌ Error:', err.message);
  const status = err.status || 500;
  res.status(status).json({ message: err.message || 'Внутренняя ошибка сервера' });
}

function asyncWrap(fn) {
  return (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
}

module.exports = { errorHandler, asyncWrap };