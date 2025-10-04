const router = require('express').Router();
const { z } = require('zod');
const validate = require("../middlewares/validate")
const { auth, requireRole } = require("../middlewares/auth");
const { convert } = require('../services/currencyService');
const { createExpense, listMine, getExpense } = require('../repositories/expenseRepo');
const { bootstrapFirstStep } = require('../services/approvalService');


router.use(auth);


const createSchema = z.object({
  title: z.string().min(2),
  description: z.string().optional(),
  expense_currency: z.string().length(3),
  amount_decimal: z.number().positive(),
  expense_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
});


router.post('/', requireRole('EMPLOYEE', 'MANAGER', 'ADMIN'), validate(createSchema), async (req, res, next) => {
  try {
    const companyCurrency = (await require('../lib/db').pool.query('SELECT currency_code FROM companies WHERE id=?', [req.user.company_id]))[0][0].currency_code;
    const converted = await convert(req.body.amount_decimal, req.body.expense_currency, companyCurrency);
    const id = await createExpense({
      company_id: req.user.company_id,
      employee_id: req.user.id,
      title: req.body.title,
      description: req.body.description,
      expense_currency: req.body.expense_currency,
      amount_decimal: req.body.amount_decimal,
      amount_in_company_ccy: converted,
      expense_date: req.body.expense_date
    });
    const expense = await getExpense(id);
    await bootstrapFirstStep(expense);
    res.json({ id });
  } catch (e) { next(e); }
});


router.get('/mine', async (req, res, next) => {
  try {
    const rows = await listMine(req.user.company_id, req.user.id, req.query.status);
    res.json(rows);
  } catch (e) { next(e); }
});


module.exports = router;