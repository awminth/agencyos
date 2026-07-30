import type { Request, Response } from 'express';
import { askHelpChat } from '../services/helpChatService.js';

export async function chat(req: Request, res: Response): Promise<void> {
  const result = await askHelpChat({
    message: req.body?.message,
    history: req.body?.history,
  });
  res.json(result);
}
