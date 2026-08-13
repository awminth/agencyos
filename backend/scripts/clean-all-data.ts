/**
 * Wipe all business/demo data. Keeps login users + print/currency/system variables.
 *
 * Clears: workers, students, invoices, payments, bank accounts, fee payments,
 * push subscriptions, help-chat daily usage.
 *
 * Usage: npx tsx scripts/clean-all-data.ts
 */
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile(filePath: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return out;
  for (const line of fs.readFileSync(filePath, 'utf-8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

async function count(conn: mysql.Connection, table: string): Promise<number> {
  try {
    const [rows] = await conn.query<{ c: number }[]>(`SELECT COUNT(*) AS c FROM \`${table}\``);
    return Number((rows as { c: number }[])[0]?.c || 0);
  } catch {
    return -1;
  }
}

async function main() {
  const env = {
    ...loadEnvFile(path.join(backendRoot, '.env')),
    ...process.env,
  };

  const conn = await mysql.createConnection({
    host: env.DB_HOST,
    port: Number(env.DB_PORT || 3306),
    user: env.DB_USER,
    password: env.DB_PASSWORD,
    database: env.DB_NAME,
    multipleStatements: true,
  });

  const tables = [
    'invoice_payments',
    'invoice_lines',
    'invoices',
    'student_invoice_payments',
    'student_invoice_lines',
    'student_invoices',
    'fee_payments',
    'financial_configs',
    'deployments',
    'workers',
    'student_financial_configs',
    'student_deployments',
    'students',
    'bank_accounts',
    'push_subscriptions',
    'help_chat_daily_usage',
  ];

  console.log(`[clean] DB ${env.DB_HOST}/${env.DB_NAME}`);
  console.log('[clean] Before:');
  for (const t of tables) {
    const c = await count(conn, t);
    if (c >= 0) console.log(`  ${t}: ${c}`);
  }

  await conn.query('SET FOREIGN_KEY_CHECKS = 0');
  for (const t of tables) {
    try {
      await conn.query(`TRUNCATE TABLE \`${t}\``);
      console.log(`[clean] truncated ${t}`);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      // Table may not exist yet on fresh DBs
      console.log(`[clean] skip ${t}: ${msg}`);
    }
  }
  await conn.query('SET FOREIGN_KEY_CHECKS = 1');

  console.log('[clean] After:');
  for (const t of tables) {
    const c = await count(conn, t);
    if (c >= 0) console.log(`  ${t}: ${c}`);
  }

  const users = await count(conn, 'users');
  const vars = await count(conn, 'system_variables');
  console.log(`[clean] Kept users=${users}, system_variables=${vars}`);
  console.log('[clean] Done.');
  await conn.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
