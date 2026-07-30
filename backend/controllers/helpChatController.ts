import type { Request, Response } from 'express';
import { AppError } from '../middlewares/errorHandler.js';
import { askHelpChat, getHelpChatQuota } from '../services/helpChatService.js';

export async function quota(req: Request, res: Response): Promise<void> {
  const userId = req.currentUser?.id;
  if (!userId) {
    throw new AppError('Authentication required', 401);
  }
  const result = await getHelpChatQuota(userId);
  res.json(result);
}

export async function chat(req: Request, res: Response): Promise<void> {
  const userId = req.currentUser?.id;
  if (!userId) {
    throw new AppError('Authentication required', 401);
  }
  const result = await askHelpChat({
    userId,
    message: req.body?.message,
    history: req.body?.history,
  });
  res.json(result);
}
