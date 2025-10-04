const router = require('express').Router();


const decisionSchema = z.object({ decision: z.enum(['APPROVED', 'REJECTED']), comment: z.string().optional() });
router.post('/:approvalId/decision', validate(decisionSchema), async (req, res, next) => {
  try {
    const approvalId = Number(req.params.approvalId);
    await decide(approvalId, req.body.decision, req.body.comment);
    const expId = (await require('../lib/db').pool.query('SELECT expense_id FROM expense_approvals WHERE id=?', [approvalId]))[0][0].expense_id;
    const expense = await getExpense(expId);
    await advanceIfPassed(expense);
    res.json({ ok: true });
  } catch (e) { next(e); }
});


module.exports = router;