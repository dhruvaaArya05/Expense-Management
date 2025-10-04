require('dotenv').config();
module.exports = {
  PORT: process.env.PORT || 4000,
  JWT_SECRET: process.env.JWT_SECRET || 'changeme',
  UPLOAD_DIR: process.env.UPLOAD_DIR || 'uploads'
};