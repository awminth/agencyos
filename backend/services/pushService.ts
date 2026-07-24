import { createHash, randomUUID } from 'crypto';
import type { RowDataPacket } from 'mysql2';
import webpush from 'web-push';
import { env, isWebPushConfigured } from '../config/env.js';
import { pool } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';

export interface PushSubscriptionInput {
  endpoint: string;
  keys: {
    p256dh: string;
    auth: string;
  };
}

interface SubRow extends RowDataPacket {
  id: string;
  user_id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  last_alert_fingerprint: string | null;
}

let vapidReady = false;
let tableReady = false;

function hashEndpoint(endpoint: string): string {
  return createHash('sha256').update(endpoint).digest('hex');
}

export function ensureVapidConfigured(): void {
  if (!isWebPushConfigured()) {
    throw new AppError(
      'Web Push is not configured. Add VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY to backend/.env',
      503
    );
  }
  if (!vapidReady) {
    webpush.setVapidDetails(env.vapidSubject, env.vapidPublicKey, env.vapidPrivateKey);
    vapidReady = true;
  }
}

export async function ensurePushSubscriptionsTable(): Promise<void> {
  if (tableReady) return;
  await pool.execute(`
    CREATE TABLE IF NOT EXISTS push_subscriptions (
      id VARCHAR(36) PRIMARY KEY,
      user_id VARCHAR(36) NOT NULL,
      endpoint TEXT NOT NULL,
      endpoint_hash CHAR(64) NOT NULL,
      p256dh VARCHAR(255) NOT NULL,
      auth VARCHAR(255) NOT NULL,
      user_agent VARCHAR(500) NULL,
      last_alert_fingerprint VARCHAR(64) NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
      UNIQUE KEY uq_push_endpoint_hash (endpoint_hash),
      KEY idx_push_user (user_id)
    )
  `);
  tableReady = true;
}

export function getPublicVapidKey(): { configured: boolean; publicKey: string; subject: string } {
  return {
    configured: isWebPushConfigured(),
    publicKey: env.vapidPublicKey,
    subject: env.vapidSubject,
  };
}

export async function saveSubscription(
  userId: string,
  sub: PushSubscriptionInput,
  userAgent?: string
): Promise<void> {
  ensureVapidConfigured();
  await ensurePushSubscriptionsTable();

  const endpoint = String(sub.endpoint || '').trim();
  const p256dh = String(sub.keys?.p256dh || '').trim();
  const auth = String(sub.keys?.auth || '').trim();
  if (!endpoint || !p256dh || !auth) {
    throw new AppError('Invalid push subscription payload', 400);
  }

  const id = randomUUID();
  const endpointHash = hashEndpoint(endpoint);
  const ua = userAgent ? userAgent.slice(0, 500) : null;

  await pool.execute(
    `INSERT INTO push_subscriptions
      (id, user_id, endpoint, endpoint_hash, p256dh, auth, user_agent)
     VALUES (:id, :userId, :endpoint, :endpointHash, :p256dh, :auth, :ua)
     ON DUPLICATE KEY UPDATE
       user_id = VALUES(user_id),
       endpoint = VALUES(endpoint),
       p256dh = VALUES(p256dh),
       auth = VALUES(auth),
       user_agent = VALUES(user_agent),
       updated_at = CURRENT_TIMESTAMP`,
    { id, userId, endpoint, endpointHash, p256dh, auth, ua }
  );
}

export async function removeSubscription(userId: string, endpoint: string): Promise<void> {
  await ensurePushSubscriptionsTable();
  const endpointHash = hashEndpoint(endpoint);
  await pool.execute(
    `DELETE FROM push_subscriptions WHERE user_id = :userId AND endpoint_hash = :endpointHash`,
    { userId, endpointHash }
  );
}

async function listSubscriptions(): Promise<SubRow[]> {
  await ensurePushSubscriptionsTable();
  const [rows] = await pool.execute<SubRow[]>(
    `SELECT id, user_id, endpoint, p256dh, auth, last_alert_fingerprint FROM push_subscriptions`
  );
  return rows;
}

async function deleteSubscriptionById(id: string): Promise<void> {
  await pool.execute(`DELETE FROM push_subscriptions WHERE id = :id`, { id });
}

async function setFingerprint(id: string, fingerprint: string): Promise<void> {
  await pool.execute(
    `UPDATE push_subscriptions SET last_alert_fingerprint = :fp WHERE id = :id`,
    { id, fp: fingerprint }
  );
}

export async function computeAlertSnapshot(): Promise<{
  fingerprint: string;
  count: number;
  title: string;
  body: string;
}> {
  const today = new Date().toISOString().slice(0, 10);
  const in7 = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);
  const in30 = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [invRows] = await pool.execute<RowDataPacket[]>(
    `SELECT i.id, i.invoice_no, i.next_invoice_date, w.name AS worker_name
     FROM invoices i
     JOIN workers w ON w.id = i.worker_id
     WHERE COALESCE(i.fee_type, 'management') = 'management'
       AND i.status <> 'Paid'
       AND i.next_invoice_date >= :today
       AND i.next_invoice_date <= :in7
     ORDER BY i.next_invoice_date ASC
     LIMIT 50`,
    { today, in7 }
  );

  const [wRows] = await pool.execute<RowDataPacket[]>(
    `SELECT w.id, w.name, d.contract_end_date
     FROM workers w
     JOIN deployments d ON d.worker_id = w.id
     WHERE w.status = 'Active'
       AND d.contract_end_date IS NOT NULL
       AND d.contract_end_date >= :today
       AND d.contract_end_date <= :in30
     ORDER BY d.contract_end_date ASC
     LIMIT 50`,
    { today, in30 }
  );

  const ids = [
    ...invRows.map((r) => `inv-${r.id}`),
    ...wRows.map((r) => `w-${r.id}`),
  ].sort();
  const fingerprint = createHash('sha256').update(ids.join('|')).digest('hex').slice(0, 32);
  const count = ids.length;

  let body = 'No active alerts';
  if (count > 0) {
    const parts: string[] = [];
    if (invRows.length) parts.push(`${invRows.length} invoice(s) due within 7 days`);
    if (wRows.length) parts.push(`${wRows.length} contract(s) ending within 30 days`);
    body = parts.join(' · ');
  }

  return {
    fingerprint,
    count,
    title: count ? `AgencyOS · ${count} alert(s)` : 'AgencyOS',
    body,
  };
}

export async function dispatchAlertPushes(): Promise<{
  configured: boolean;
  sent: number;
  skipped: number;
  removed: number;
}> {
  if (!isWebPushConfigured()) {
    return { configured: false, sent: 0, skipped: 0, removed: 0 };
  }
  ensureVapidConfigured();

  const snapshot = await computeAlertSnapshot();
  if (snapshot.count === 0) {
    return { configured: true, sent: 0, skipped: 0, removed: 0 };
  }

  const subs = await listSubscriptions();
  let sent = 0;
  let skipped = 0;
  let removed = 0;

  const payload = JSON.stringify({
    title: snapshot.title,
    body: snapshot.body,
    tag: `agency-os-${snapshot.fingerprint}`,
  });

  for (const sub of subs) {
    if (sub.last_alert_fingerprint === snapshot.fingerprint) {
      skipped += 1;
      continue;
    }
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload
      );
      await setFingerprint(sub.id, snapshot.fingerprint);
      sent += 1;
    } catch (err: unknown) {
      const statusCode =
        typeof err === 'object' && err && 'statusCode' in err
          ? Number((err as { statusCode?: number }).statusCode)
          : 0;
      if (statusCode === 404 || statusCode === 410) {
        await deleteSubscriptionById(sub.id);
        removed += 1;
      } else {
        console.warn('Web push send failed:', err);
      }
    }
  }

  return { configured: true, sent, skipped, removed };
}

export async function sendTestPush(userId: string): Promise<{ sent: number }> {
  ensureVapidConfigured();
  await ensurePushSubscriptionsTable();
  const [rows] = await pool.execute<SubRow[]>(
    `SELECT id, user_id, endpoint, p256dh, auth, last_alert_fingerprint
     FROM push_subscriptions WHERE user_id = :userId`,
    { userId }
  );
  if (!rows.length) {
    throw new AppError('No push subscription for this user. Enable browser notifications first.', 404);
  }

  const payload = JSON.stringify({
    title: 'AgencyOS',
    body: 'Test notification — Web Push is working.',
    tag: 'agency-os-test',
  });

  let sent = 0;
  for (const sub of rows) {
    try {
      await webpush.sendNotification(
        {
          endpoint: sub.endpoint,
          keys: { p256dh: sub.p256dh, auth: sub.auth },
        },
        payload
      );
      sent += 1;
    } catch (err: unknown) {
      const statusCode =
        typeof err === 'object' && err && 'statusCode' in err
          ? Number((err as { statusCode?: number }).statusCode)
          : 0;
      if (statusCode === 404 || statusCode === 410) {
        await deleteSubscriptionById(sub.id);
      } else {
        throw err;
      }
    }
  }
  return { sent };
}
