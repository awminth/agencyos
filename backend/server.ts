import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createApp } from './app.js';
import { pingDb } from './config/db.js';
import { env, isWebPushConfigured } from './config/env.js';
import { ensurePermissionsColumn } from './services/usersService.js';
import { ensureFinancialConfigCurrency } from './services/workerService.js';
import { ensureSchoolNameCategory, ensureVariableParentValue, ensurePrintSettingsSlots, ensureBankAccountsTable } from './services/settingsService.js';
import { ensureSchoolInvoiceSchema } from './services/studentInvoiceService.js';
import { ensureHostInvoiceSchema } from './services/invoiceService.js';
import {
  dispatchAlertPushes,
  ensurePushSubscriptionsTable,
} from './services/pushService.js';
import { ensureHelpChatUsageTable } from './services/helpChatService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function start() {
  try {
    await pingDb();
    console.log(`MySQL connected: ${env.dbName}@${env.dbHost}:${env.dbPort}`);
    await ensurePermissionsColumn();
    await ensureFinancialConfigCurrency();
    await ensureSchoolNameCategory();
    await ensureVariableParentValue();
    await ensurePrintSettingsSlots();
    await ensureBankAccountsTable();
    await ensureSchoolInvoiceSchema();
    await ensureHostInvoiceSchema();
    await ensurePushSubscriptionsTable();
    await ensureHelpChatUsageTable();
  } catch (err) {
    console.error('MySQL connection failed. Check DB_* in .env and run: npm run init-db');
    console.error(err);
    process.exit(1);
  }

  const app = createApp();
  const distPath = path.join(__dirname, 'dist');

  if (fs.existsSync(distPath)) {
    app.use(express.static(distPath));
    app.get('*', (req, res, next) => {
      if (req.path.startsWith('/api')) return next();
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(env.backendPort, '0.0.0.0', () => {
    console.log(`Agency MS API on http://0.0.0.0:${env.backendPort}`);
    if (isWebPushConfigured()) {
      console.log(`Web Push enabled (subject: ${env.vapidSubject})`);
      const tick = () => {
        void dispatchAlertPushes().catch((err) =>
          console.warn('Alert push dispatch failed:', err)
        );
      };
      tick();
      setInterval(tick, 5 * 60 * 1000);
    } else {
      console.log(
        'Web Push disabled — add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to backend/.env'
      );
    }
  });
}

start();
