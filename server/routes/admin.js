// const router = require('express').Router();
// const { auth, requireRole } = require("../middlewares/auth");
// const { pool } = require('../lib/db');
// const { setSequence, setRule } = require('../repositories/configRepo');
// const { z } = require('zod');
// const validate = require('../middlewares/validate');


// router.use(auth, requireRole('ADMIN'));


// const userSchema = z.object({ name: z.string().min(2), email: z.string().email(), password: z.string().min(6), role: z.enum(['MANAGER', 'EMPLOYEE']) });
// router.post('/users', validate(userSchema), async (req, res, next) => {
//   try {
//     const { name, email, password, role } = req.body;
//     const [exist] = await pool.query('SELECT id FROM users WHERE email=? AND company_id=?', [email, req.user.company_id]);
//     if (exist[0]) return res.status(409).json({ error: 'Email exists' });
//     const bcrypt = require('bcrypt');
//     const password_hash = await bcrypt.hash(password, 10);
//     const [r] = await pool.query('INSERT INTO users(company_id,name,email,password_hash,role) VALUES (?,?,?,?,?)', [req.user.company_id, name, email, password_hash, role]);
//     res.json({ id: r.insertId });
//   } catch (e) { next(e); }
// });


// const mapSchema = z.object({ employee_id: z.number().int().positive(), manager_id: z.number().int().positive(), is_manager_approver: z.boolean().optional() });
// router.post('/manager-map', validate(mapSchema), async (req, res, next) => {
//   try {
//     const { employee_id, manager_id, is_manager_approver } = req.body;
//     // Validate both users belong to admin's company
//     const [users] = await pool.query(
//       'SELECT COUNT(*) as count FROM users WHERE id IN (?,?) AND company_id=?',
//       [employee_id, manager_id, req.user.company_id]
//     );
//     if (users[0].count !== 2) {
//       return res.status(404).json({ error: 'Users not found in your company' });
//     }
//     await pool.query('REPLACE INTO manager_map(employee_id,manager_id) VALUES (?,?)', [employee_id, manager_id]);
//     if (typeof is_manager_approver === 'boolean') {
//       await pool.query('UPDATE users SET is_manager_approver=? WHERE id=?', [is_manager_approver, manager_id]);
//     }
//     res.json({ ok: true });
//   } catch (e) { next(e); }
// });


// const seqSchema = z.object({ steps: z.array(z.object({ step: z.number().int().positive(), approver_role: z.enum(['MANAGER', 'ADMIN', 'EMPLOYEE', 'SPECIFIC_USER']), specific_user_id: z.number().int().optional() })).min(1) });
// router.put('/sequence', validate(seqSchema), async (req, res, next) => {
//   try {
//     await setSequence(req.user.company_id, req.body.steps);
//     res.json({ ok: true });
//   } catch (e) { next(e); }
// });


// const ruleSchema = z.object({ logic: z.enum(['ANY', 'ALL', 'PERCENTAGE', 'SPECIFIC', 'PERCENTAGE_OR_SPECIFIC']), min_percentage_approve: z.number().int().min(1).max(100).optional(), specific_approver_user_id: z.number().int().optional() });
// router.put('/rule', validate(ruleSchema), async (req, res, next) => {
//   try {
//     await setRule(req.user.company_id, req.body);
//     res.json({ ok: true });
//   } catch (e) { next(e); }
// });


// router.post('/override/:expenseId/:action(approve|reject)', async (req, res, next) => {
//   try {
//     const { expenseId, action } = req.params;
//     const expenseIdNum = parseInt(expenseId, 10);
//     if (isNaN(expenseIdNum)) {
//       return res.status(400).json({ error: 'Invalid expense ID' });
//     }
//     // Verify expense belongs to admin's company
//     const [expense] = await pool.query(
//       'SELECT id FROM expenses WHERE id=? AND company_id=?',
//       [expenseIdNum, req.user.company_id]
//     );
//     if (!expense[0]) {
//       return res.status(404).json({ error: 'Expense not found' });
//     }
//     await pool.query('UPDATE expenses SET status=? WHERE id=?', [action === 'approve' ? 'APPROVED' : 'REJECTED', expenseId]);
//     await pool.query('INSERT INTO audit_logs(company_id,user_id,action,entity,entity_id,payload) VALUES (?,?,?,?,?,?)', [req.user.company_id, req.user.id, 'ADMIN_OVERRIDE', 'expense', expenseId, JSON.stringify({ action })]);
//     res.json({ ok: true });
//   } catch (e) { next(e); }
// });


// module.exports = router;

// server/src/routes/admin.js
const router = require('express').Router();
const { z } = require('zod');
const validate = require("../middlewares/validate")
const { auth, requireRole } = require("../middlewares/auth")
const { pool } = require('../lib/db');
const { setSequence, setRule } = require('../repositories/configRepo');

// Only admins can use these routes
router.use(auth, requireRole('ADMIN'));

// ------------------- Create User -------------------
const userSchema = z.object({
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6),
  role: z.enum(['MANAGER', 'EMPLOYEE'])
});

router.post('/users', validate(userSchema), async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    const [exist] = await pool.query('SELECT id FROM users WHERE email=?', [email]);
    if (exist[0]) return res.status(409).json({ error: 'Email already exists' });

    const bcrypt = require('bcrypt');
    const password_hash = await bcrypt.hash(password, 10);

    const [r] = await pool.query(
      'INSERT INTO users(company_id,name,email,password_hash,role) VALUES (?,?,?,?,?)',
      [req.user.company_id, name, email, password_hash, role]
    );

    res.json({ id: r.insertId });
  } catch (e) {
    next(e);
  }
});

// ------------------- Manager Mapping -------------------
const mapSchema = z.object({
  employee_id: z.number().int().positive(),
  manager_id: z.number().int().positive(),
  is_manager_approver: z.boolean().optional()
});

router.post('/manager-map', validate(mapSchema), async (req, res, next) => {
  try {
    const { employee_id, manager_id, is_manager_approver } = req.body;

    await pool.query(
      'REPLACE INTO manager_map(employee_id,manager_id) VALUES (?,?)',
      [employee_id, manager_id]
    );

    if (typeof is_manager_approver === 'boolean') {
      await pool.query('UPDATE users SET is_manager_approver=? WHERE id=?', [
        is_manager_approver,
        manager_id
      ]);
    }

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ------------------- Approval Sequence -------------------
const seqSchema = z.object({
  steps: z
    .array(
      z.object({
        step: z.number().int().positive(),
        approver_role: z.enum(['MANAGER', 'ADMIN', 'EMPLOYEE', 'SPECIFIC_USER']),
        specific_user_id: z.number().int().optional()
      })
    )
    .min(1)
});

router.put('/sequence', validate(seqSchema), async (req, res, next) => {
  try {
    await setSequence(req.user.company_id, req.body.steps);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ------------------- Approval Rules -------------------
const ruleSchema = z.object({
  logic: z.enum(['ANY', 'ALL', 'PERCENTAGE', 'SPECIFIC', 'PERCENTAGE_OR_SPECIFIC']),
  min_percentage_approve: z.number().int().min(1).max(100).optional(),
  specific_approver_user_id: z.number().int().optional()
});

router.put('/rule', validate(ruleSchema), async (req, res, next) => {
  try {
    await setRule(req.user.company_id, req.body);
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

// ------------------- Admin Override -------------------
router.post('/override/:expenseId/:action', async (req, res, next) => {
  try {
    const { expenseId, action } = req.params;

    // Validate action manually instead of regex in path
    if (!['approve', 'reject'].includes(action)) {
      return res.status(400).json({ error: 'Invalid action' });
    }

    await pool.query('UPDATE expenses SET status=? WHERE id=?', [
      action === 'approve' ? 'APPROVED' : 'REJECTED',
      expenseId
    ]);

    await pool.query(
      'INSERT INTO audit_logs(company_id,user_id,action,entity,entity_id,payload) VALUES (?,?,?,?,?,?)',
      [
        req.user.company_id,
        req.user.id,
        'ADMIN_OVERRIDE',
        'expense',
        expenseId,
        JSON.stringify({ action })
      ]
    );

    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

module.exports = router;
