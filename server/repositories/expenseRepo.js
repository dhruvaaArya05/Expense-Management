const { pool } = require('../lib/db');


async function createExpense(exp) {
  const [r] = await pool.query(
    `INSERT INTO expenses(company_id,employee_id,title,description,expense_currency,amount_decimal,amount_in_company_ccy,expense_date,status,current_step)
VALUES (?,?,?,?,?,?,?,?,?,?)`,
    [exp.company_id, exp.employee_id, exp.title, exp.description || null, exp.expense_currency, exp.amount_decimal, exp.amount_in_company_ccy, exp.expense_date, 'PENDING', 0]
  );
  return r.insertId;
}
async function getExpense(id) {
  const [rows] = await pool.query('SELECT * FROM expenses WHERE id=?', [id]);
  return rows[0];
}
async function listMine(companyId, userId, status) {
  const params = [companyId, userId];
  let sql = 'SELECT * FROM expenses WHERE company_id=? AND employee_id=?';
  if (status) { sql += ' AND status=?'; params.push(status); }
  sql += ' ORDER BY created_at DESC';
  const [rows] = await pool.query(sql, params);
  return rows;
}
async function updateExpenseState(id, fields) {
  const keys = Object.keys(fields);
  const sets = keys.map(k => `${k}=?`).join(',');
  const vals = keys.map(k => fields[k]);
  vals.push(id);
  await pool.query(`UPDATE expenses SET ${sets} WHERE id=?`, vals);
}
module.exports = { createExpense, getExpense, listMine, updateExpenseState };