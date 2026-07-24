import type { Request, Response } from 'express';
import * as workerService from '../services/workerService.js';

export async function list(req: Request, res: Response): Promise<void> {
  const workers = await workerService.listWorkers({
    status: typeof req.query.status === 'string' ? req.query.status : undefined,
    visaType: typeof req.query.visaType === 'string' ? req.query.visaType : undefined,
    search: typeof req.query.search === 'string' ? req.query.search : undefined,
    expiringDays:
      typeof req.query.expiringDays === 'string' ? req.query.expiringDays : undefined,
  });
  res.json(workers);
}

export async function getById(req: Request, res: Response): Promise<void> {
  const worker = await workerService.getWorkerById(req.params.id);
  if (!worker) {
    res.status(404).json({ error: 'Worker not found' });
    return;
  }
  res.json(worker);
}

export async function create(req: Request, res: Response): Promise<void> {
  const worker = await workerService.createWorker(req.body);
  res.status(201).json(worker);
}

export async function update(req: Request, res: Response): Promise<void> {
  const worker = await workerService.updateWorker(req.params.id, req.body);
  res.json(worker);
}

export async function getRelated(req: Request, res: Response): Promise<void> {
  const related = await workerService.getWorkerRelated(req.params.id);
  res.json(related);
}

export async function remove(req: Request, res: Response): Promise<void> {
  const result = await workerService.deleteWorker(req.params.id);
  res.json({
    success: true,
    message: 'Worker deleted successfully',
    deletedInvoices: result.deletedInvoices,
  });
}
