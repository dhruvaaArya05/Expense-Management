const router = require('express').Router();
const { auth, requireRole } = require('../middleware/auth');
const { pool } = require('../lib/db');
const { setSequence, setRule } = require('../repositories/configRepo');


router.use(auth, requireRole('ADMIN'));


const userSchema = z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(6), role: z.enum(['MANAGER', 'EMPLOYEE']) });
router.post('/users', validate(userSchema), async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const [exist] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
    if (exist[0]) return res.status(409).json({ error: 'Email exists' });
    const bcrypt = require('bcrypt');
    const password_hash = await bcrypt.hash(password, 10);
    const [r] = await pool.query('INSERT INTO users(company_id,name,email,password_hash,role) VALUES (?,?,?,?,?)', [req.user.company_id, name, email, password_hash, role]);
    res.json({ id: r.insertId });
  } catch (e) { next(e); }
});


const mapSchema = z.object({ employee_id: z.number().int().positive(), manager_id: z.number().int().positive(), is_manager_approver: z.boolean().optional() });
router.post('/manager-map', validate(mapSchema), async (req, res, next) => {
  try {
    const { employee_id, manager_id, is_manager_approver } = req.body;
    await pool.query('REPLACE INTO manager_map(employee_id,manager_id) VALUES (?,?)', [employee_id, manager_id]);
    if (typeof is_manager_approver === 'boolean') {
      await pool.query('UPDATE users SET is_manager_approver=? WHERE id=?', [is_manager_approver, manager_id]);
    }
    res.json({ ok: true });
  } catch (e) { next(e); }
});


const seqSchema = z.object({ steps: z.array(z.object({ step: z.number().int().positive(), approver_role: z.enum(['MANAGER', 'ADMIN', 'EMPLOYEE', 'SPECIFIC_USER']), specific_user_id: z.number().int().optional() })).min(1) });
router.put('/sequence', validate(seqSchema), async (req, res, next) => {
  try {
    await setSequence(req.user.company_id, req.body.steps);
    res.json({ ok: true });
  } catch (e) { next(e); }
});


const ruleSchema = z.object({ logic: z.enum(['ANY', 'ALL', 'PERCENTAGE', 'SPECIFIC', 'PERCENTAGE_OR_SPECIFIC']), min_percentage_approve: z.number().int().min(1).max(100).optional(), specific_approver_user_id: z.number().int().optional() });
router.put('/rule', validate(ruleSchema), async (req, res, next) => {
  try {
    await setRule(req.user.company_id, req.body);
    res.json({ ok: true });
  } catch (e) { next(e); }
});


router.post('/override/:expenseId/:action(approve|reject)', async (req, res, next) => {
  try {
    const { expenseId, action } = req.params;
    await pool.query('UPDATE expenses SET status=? WHERE id=?', [action === 'approve' ? 'APPROVED' : 'REJECTED', expenseId]);
    await pool.query('INSERT INTO audit_logs(company_id,user_id,action,entity,entity_id,payload) VALUES (?,?,?,?,?,?)', [req.user.company_id, req.user.id, 'ADMIN_OVERRIDE', 'expense', expenseId, JSON.stringify({ action })]);
    res.json({ ok: true });
  } catch (e) { next(e); }
});


module.exports = router;