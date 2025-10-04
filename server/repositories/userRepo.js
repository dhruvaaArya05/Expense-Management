const { pool } = require('../lib/db');


async function getUserByEmail(email) {
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  return rows[0];
}
async function createCompany(name, country, currency) {
  const [r] = await pool.query('INSERT INTO companies(name,country_code,currency_code) VALUES (?,?,?)', [name, country, currency]);
  return r.insertId;
}
async function createUser({ company_id, name, email, password_hash, role }) {
  const [r] = await pool.query(
    'INSERT INTO users(company_id,name,email,password_hash,role) VALUES (?,?,?,?,?)',
    [company_id, name, email, password_hash, role]
  );
  return r.insertId;
}
async function setManager(employeeId, managerId) {
  await pool.query('REPLACE INTO manager_map(employee_id,manager_id) VALUES (?,?)', [employeeId, managerId]);
}
async function getManager(employeeId) {
  const [rows] = await pool.query('SELECT u.* FROM manager_map m JOIN users u ON u.id=m.manager_id WHERE m.employee_id=?', [employeeId]);
  return rows[0];
}
module.exports = { getUserByEmail, createCompany, createUser, setManager, getManager };