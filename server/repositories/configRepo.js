const pool = require('../lib/db');

async function setSequence(companyId, steps) {
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.query('DELETE FROM approver_sequence WHERE company_id=?', [companyId]);
    for (const s of steps) {
      await conn.query(
        'INSERT INTO approver_sequence(company_id,step,approver_role,specific_user_id) VALUES (?,?,?,?)',
        [companyId, s.step, s.approver_role, s.specific_user_id || null]
      );
    }
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
async function getSequence(companyId) {
  const [rows] = await pool.query('SELECT * FROM approver_sequence WHERE company_id=? ORDER BY step', [companyId]);
  return rows;
}
async function setRule(companyId, rule) {
  await pool.query('DELETE FROM approval_rules WHERE company_id=?', [companyId]);
  await pool.query(
    'INSERT INTO approval_rules(company_id,min_percentage_approve,specific_approver_user_id,logic,is_active) VALUES (?,?,?,?,TRUE)',
    [companyId, rule.min_percentage_approve || null, rule.specific_approver_user_id || null, rule.logic]
  );
}
async function getRule(companyId) {
  const [rows] = await pool.query('SELECT * FROM approval_rules WHERE company_id=? AND is_active=TRUE LIMIT 1', [companyId]);
  return rows[0];
}
module.exports = { setSequence, getSequence, setRule, getRule };