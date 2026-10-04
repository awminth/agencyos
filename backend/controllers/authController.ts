import type { Request, Response } from 'express';
import * as authService from '../services/authService.js';

function deviceLabelFromReq(req: Request): string {
  if (typeof req.body?.deviceLabel === 'string' && req.body.deviceLabel.trim()) {
    return req.body.deviceLabel.trim();
  }
  const ua = String(req.header('user-agent') || '').trim();
  return ua.slice(0, 255);
}

export async function login(req: Request, res: Response): Promise<void> {
  const email = typeof req.body?.email === 'string' ? req.body.email : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';
  const existingSessionToken =
    typeof req.body?.sessionToken === 'string' ? req.body.sessionToken : '';

  const user = await authService.loginWithEmailPassword(email, password, {
    existingSessionToken,
    deviceLabel: deviceLabelFromReq(req),
  });
  res.json({ user, sessionToken: user.sessionToken });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const userId =
    typeof req.body?.userId === 'string'
      ? req.body.userId
      : String(req.header('x-user-id') || '');
  const sessionToken =
    typeof req.body?.sessionToken === 'string'
      ? req.body.sessionToken
      : String(req.header('x-session-token') || '');

  await authService.logoutSession(userId, sessionToken);
  res.json({ success: true });
}

export async function heartbeat(req: Request, res: Response): Promise<void> {
  const userId =
    typeof req.body?.userId === 'string'
      ? req.body.userId
      : String(req.header('x-user-id') || '');
  const sessionToken =
    typeof req.body?.sessionToken === 'string'
      ? req.body.sessionToken
      : String(req.header('x-session-token') || '');

  const result = await authService.heartbeatSession(userId, sessionToken);
  res.json(result);
}
