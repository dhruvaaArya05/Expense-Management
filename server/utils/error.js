function errorHandler(err, req, res, next) {
  console.error(err);
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
}
function httpError(status, message) {
  const e = new Error(message);
  e.status = status;
  return e;
}
module.exports = { errorHandler, httpError };