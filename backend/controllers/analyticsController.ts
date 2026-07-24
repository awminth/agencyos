import type { Request, Response } from 'express';
import * as analyticsService from '../services/analyticsService.js';

export async function getStats(_req: Request, res: Response): Promise<void> {
  const stats = await analyticsService.getDashboardStats();
  res.json(stats);
}
