const { pool } = require('../lib/db');


async function createApprovals(expenseId, step, approverIds) {
  if (!approverIds.length) return;
  const values = approverIds.map(a => [expenseId, a, step]);
  await pool.query('INSERT INTO expense_approvals(expense_id, approver_id, step) VALUES ?', [values]);
}
async function approvalsForExpense(expenseId) {
  const [rows] = await pool.query('SELECT * FROM expense_approvals WHERE expense_id=?', [expenseId]);
  return rows;
}
async function myPendingApprovals(userId) {
  const [rows] = await pool.query(
    `SELECT ea.*, e.title, e.amount_in_company_ccy, e.expense_currency, e.status
FROM expense_approvals ea JOIN expenses e ON e.id=ea.expense_id
WHERE ea.approver_id=? AND ea.decision='PENDING' AND e.status='PENDING'
ORDER BY e.created_at DESC`, [userId]
  );
  return rows;
}
async function decide(approvalId, decision, comment) {
  await pool.query('UPDATE expense_approvals SET decision=?, comment=?, decided_at=NOW() WHERE id=?', [decision, comment || null, approvalId]);
}
async function approverStats(expenseId, step) {
  const [rows] = await pool.query('SELECT decision FROM expense_approvals WHERE expense_id=? AND step=?', [expenseId, step]);
  const total = rows.length;
  const approved = rows.filter(r => r.decision === 'APPROVED').length;
  const rejected = rows.filter(r => r.decision === 'REJECTED').length;
  return { total, approved, rejected };
}
module.exports = { createApprovals, approvalsForExpense, myPendingApprovals, decide, approverStats };