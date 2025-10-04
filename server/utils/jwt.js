const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../lib/env');
module.exports = {
  sign: (payload) => jwt.sign(payload, JWT_SECRET, { expiresIn: '12h' }),
  verify: (token) => jwt.verify(token, JWT_SECRET)
};