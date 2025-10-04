const { pool } = require('../lib/db');
async function convert(amount, from, to) {
  if (from === to) return amount;
  const [rows] = await pool.query('SELECT rate FROM exchange_rates WHERE base_ccy=? AND quote_ccy=? ORDER BY as_of DESC LIMIT 1', [from, to]);
  if (!rows[0]) return amount; // fallback 1:1
  const rate = rows[0].rate;
  return Number((amount * rate).toFixed(2));
}
module.exports = { convert };