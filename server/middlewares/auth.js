const { verify } = require('../utils/jwt');
const { httpError } = require('../utils/error');


function auth(req, res, next) {
  const hdr = req.headers.authorization || '';
  const token = hdr.startsWith('Bearer ') ? hdr.slice(7) : null;
  if (!token) return next(httpError(401, 'Missing token'));
  try {
    req.user = verify(token);
    next();
  } catch {
    next(httpError(401, 'Invalid token'));
  }
}


function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(httpError(403, 'Forbidden'));
    }
    next();
  };
}


module.exports = { auth, requireRole };