const { getManager } = require('../repositories/userRepo');
const { getSequence, getRule } = require('../repositories/configRepo');
const { createApprovals, approverStats } = require('../repositories/approvalRepo');
const { updateExpenseState } = require('../repositories/expenseRepo');
const { pool } = require('../lib/db');

async function bootstrapFirstStep(expense) {
  let step = 1;
  let approverIds = [];
  // Manager-first logic
  const mgr = await getManager(expense.employee_id);
  if (mgr && mgr.is_manager_approver) {
    approverIds = [mgr.id];
  } else {
    const seq = await getSequence(expense.company_id);
    const s1 = seq.find(x => x.step === 1);
    if (!s1) return; // no approvers configured
    if (s1.approver_role === 'SPECIFIC_USER' && s1.specific_user_id) approverIds = [s1.specific_user_id];
    if (s1.approver_role === 'ADMIN') {
      const [rows] = await pool.query('SELECT id FROM users WHERE company_id=? AND role="ADMIN"', [expense.company_id]);
      approverIds = rows.map(r => r.id);
    }
    if (s1.approver_role === 'MANAGER' && mgr) approverIds = [mgr.id];
  }
  await createApprovals(expense.id, step, approverIds);
  await updateExpenseState(expense.id, { current_step: step, status: 'PENDING' });
}

async function advanceIfPassed(expense) {
  const seq = await getSequence(expense.company_id);
  const rule = await getRule(expense.company_id);
  const current = expense.current_step;
  const currentCfg = seq.find(s => s.step === current);
  const stats = await approverStats(expense.id, current);


  let pass = false;
  if (!rule || rule.logic === 'ALL') pass = (stats.approved === stats.total);
  else if (rule.logic === 'ANY') pass = (stats.approved >= 1);
  else if (rule.logic === 'PERCENTAGE') pass = (stats.total > 0 && (stats.approved / stats.total * 100) >= rule.min_percentage_approve);
  else if (rule.logic === 'SPECIFIC') {
    const [rows] = await pool.query('SELECT decision FROM expense_approvals WHERE expense_id=? AND approver_id=?', [expense.id, rule.specific_approver_user_id]);
    pass = !!rows[0] && rows[0].decision === 'APPROVED';
  } else if (rule.logic === 'PERCENTAGE_OR_SPECIFIC') {
    const pct = (stats.total > 0 && (stats.approved / stats.total * 100) >= (rule.min_percentage_approve || 100));
    const [rows] = await pool.query('SELECT decision FROM expense_approvals WHERE expense_id=? AND approver_id=?', [expense.id, rule.specific_approver_user_id]);
    const spec = !!rows[0] && rows[0].decision === 'APPROVED';
    pass = pct || spec;
  }

  if (!pass) return false;


  // advance to next step or finalize
  const next = seq.find(s => s.step === current + 1);
  if (!next) {
    await updateExpenseState(expense.id, { status: 'APPROVED' });
    return true;
  }

  let approverIds = [];
  if (next.approver_role === 'SPECIFIC_USER' && next.specific_user_id) approverIds = [next.specific_user_id];
  if (next.approver_role === 'ADMIN') {
    const [rows] = await pool.query('SELECT id FROM users WHERE company_id=? AND role="ADMIN"', [expense.company_id]);
    approverIds = rows.map(r => r.id);
  }
  if (next.approver_role === 'MANAGER') {
    const mgr = await getManager(expense.employee_id);
    if (mgr) approverIds = [mgr.id];
  }
  await createApprovals(expense.id, current + 1, approverIds);
  await updateExpenseState(expense.id, { current_step: current + 1 });
  return true;
}

module.exports = { bootstrapFirstStep, advanceIfPassed };