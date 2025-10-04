const { ZodError } = require('zod');
const { httpError } = require('../utils/error');
module.exports = (schema) => (req, res, next) => {
  try {
    req.body = schema.parse(req.body);
    next();
  } catch (e) {
    if (e instanceof ZodError) return next(httpError(400, e.errors.map(x => x.message).join(', ')));
    next(e);
  }
};