import cors from 'cors';
import express from 'express';
import { env } from './config/env.js';
import { errorHandler } from './middlewares/errorHandler.js';
import analyticsRoutes from './routes/analytics.routes.js';
import authRoutes from './routes/auth.routes.js';
import feePaymentsRoutes from './routes/feePayments.routes.js';
import invoicesRoutes from './routes/invoices.routes.js';
import reportsRoutes from './routes/reports.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import systemRoutes from './routes/system.routes.js';
import usersRoutes from './routes/users.routes.js';
import workersRoutes from './routes/workers.routes.js';
import pushRoutes from './routes/push.routes.js';
import studentInvoicesRoutes from './routes/studentInvoices.routes.js';
import studentsRoutes from './routes/students.routes.js';

export function createApp() {
  const app = express();

  const origins = env.corsOrigin
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  app.use(
    cors({
      origin: origins.length ? origins : true,
      credentials: true,
    })
  );
  app.use(express.json({ limit: '8mb' }));

  app.use('/api/auth', authRoutes);
  app.use('/api/users', usersRoutes);
  app.use('/api/settings', settingsRoutes);
  app.use('/api/system', systemRoutes);
  app.use('/api/analytics', analyticsRoutes);
  app.use('/api/workers', workersRoutes);
  app.use('/api/students', studentsRoutes);
  app.use('/api/invoices', invoicesRoutes);
  app.use('/api/student-invoices', studentInvoicesRoutes);
  app.use('/api/fee-payments', feePaymentsRoutes);
  app.use('/api/reports', reportsRoutes);
  app.use('/api/push', pushRoutes);

  app.use(errorHandler);

  return app;
}
