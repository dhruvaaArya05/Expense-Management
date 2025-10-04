const bcrypt = require('bcrypt');
const saltRounds = 10;
module.exports = {
  hash: (pwd) => bcrypt.hash(pwd, saltRounds),
  compare: (pwd, hash) => bcrypt.compare(pwd, hash)
};