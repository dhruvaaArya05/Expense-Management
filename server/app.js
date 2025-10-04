const express = require('express');
const cors = require('cors');
const path = require('path');
const { errorHandler } = require('./utils/error');
const authRoutes = require('./routes/auth');
const adminRoutes = require('./routes/admin');
const expenseRoutes = require('./routes/expenses');
const approvalRoutes = require('./routes/approvals');
const { PORT } = require('./lib/env');


const app = express();
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), '..', process.env.UPLOAD_DIR || 'uploads')));


app.get('/', (_, res) => res.json({ ok: true, service: 'expense-mgmt-api' }));


app.use('/auth', authRoutes);
app.use('/admin', adminRoutes);
app.use('/expenses', expenseRoutes);
app.use('/approvals', approvalRoutes);


app.use(errorHandler);

app.listen(PORT, () => console.log(`API listening on http://localhost:${PORT}`));