import type { Request, Response } from 'express';
import * as pushService from '../services/pushService.js';

export async function getVapidPublicKey(_req: Request, res: Response): Promise<void> {
  res.json(pushService.getPublicVapidKey());
}

export async function subscribe(req: Request, res: Response): Promise<void> {
  const userId = req.currentUser!.id;
  const endpoint = typeof req.body?.endpoint === 'string' ? req.body.endpoint : '';
  const p256dh = typeof req.body?.keys?.p256dh === 'string' ? req.body.keys.p256dh : '';
  const auth = typeof req.body?.keys?.auth === 'string' ? req.body.keys.auth : '';

  await pushService.saveSubscription(
    userId,
    { endpoint, keys: { p256dh, auth } },
    typeof req.headers['user-agent'] === 'string' ? req.headers['user-agent'] : undefined
  );
  res.json({ ok: true });
}

export async function unsubscribe(req: Request, res: Response): Promise<void> {
  const userId = req.currentUser!.id;
  const endpoint = typeof req.body?.endpoint === 'string' ? req.body.endpoint : '';
  if (!endpoint) {
    res.status(400).json({ error: 'endpoint required' });
    return;
  }
  await pushService.removeSubscription(userId, endpoint);
  res.json({ ok: true });
}

export async function testPush(req: Request, res: Response): Promise<void> {
  const result = await pushService.sendTestPush(req.currentUser!.id);
  res.json(result);
}

export async function dispatchNow(_req: Request, res: Response): Promise<void> {
  const result = await pushService.dispatchAlertPushes();
  res.json(result);
}
