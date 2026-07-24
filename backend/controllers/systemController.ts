import type { Request, Response } from 'express';
import { systemDocumentation } from '../services/systemService.js';

export async function schemaArchitecture(_req: Request, res: Response): Promise<void> {
  res.json(systemDocumentation);
}

export async function health(_req: Request, res: Response): Promise<void> {
  res.json({ ok: true, service: 'agency-ms-backend' });
}
