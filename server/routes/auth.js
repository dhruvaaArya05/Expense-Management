const router = require('express').Router();
const validate = require('../middleware/validate');
const { createCompany, createUser, getUserByEmail } = require('../repositories/userRepo');
const { hash, compare } = require('../utils/hash');
const { sign } = require('../utils/jwt');
const { httpError } = require('../utils/error');


const signupSchema = z.object({
  company_name: z.string().min(2),
  country_code: z.string().length(2),
  currency_code: z.string().length(3),
  name: z.string().min(2),
  email: z.string().email(),
  password: z.string().min(6)
});


router.post('/signup', validate(signupSchema), async (req, res, next) => {
  try {
    const { company_name, country_code, currency_code, name, email, password } = req.body;
    const exist = await getUserByEmail(email);
    if (exist) throw httpError(409, 'Email already exists');
    const company_id = await createCompany(company_name, country_code, currency_code);
    const password_hash = await hash(password);
    const user_id = await createUser({ company_id, name, email, password_hash, role: 'ADMIN' });
    const token = sign({ id: user_id, company_id, role: 'ADMIN', name, email });
    res.json({ token });
  } catch (e) { next(e); }
});


const loginSchema = z.object({ email: z.string().email(), password: z.string().min(6) });
router.post('/login', validate(loginSchema), async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const user = await getUserByEmail(email);
    if (!user) throw httpError(401, 'Invalid credentials');
    const ok = await compare(password, user.password_hash);
    if (!ok) throw httpError(401, 'Invalid credentials');
    const token = sign({ id: user.id, company_id: user.company_id, role: user.role, name: user.name, email: user.email });
    res.json({ token });
  } catch (e) { next(e); }
});


module.exports = router;