import type { Request, Response } from 'express';
import * as authService from '../services/authService.js';

export async function login(req: Request, res: Response): Promise<void> {
  const email = typeof req.body?.email === 'string' ? req.body.email : '';
  const password = typeof req.body?.password === 'string' ? req.body.password : '';

  const user = await authService.loginWithEmailPassword(email, password);
  res.json({ user });
}
