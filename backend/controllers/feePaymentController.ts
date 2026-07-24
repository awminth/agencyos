import type { Request, Response } from 'express';
import * as feePaymentService from '../services/feePaymentService.js';

export async function list(req: Request, res: Response): Promise<void> {
  const payments = await feePaymentService.listFeePayments({
    workerId: typeof req.query.workerId === 'string' ? req.query.workerId : undefined,
    feeType: typeof req.query.feeType === 'string' ? req.query.feeType : undefined,
  });
  res.json(payments);
}

export async function create(req: Request, res: Response): Promise<void> {
  const payment = await feePaymentService.createFeePayment(req.body);
  res.status(201).json(payment);
}

export async function update(req: Request, res: Response): Promise<void> {
  const payment = await feePaymentService.updateFeePayment(req.params.id, req.body);
  res.json(payment);
}

export async function remove(req: Request, res: Response): Promise<void> {
  await feePaymentService.deleteFeePayment(req.params.id);
  res.json({ success: true, message: 'Fee payment deleted' });
}

export async function summaries(req: Request, res: Response): Promise<void> {
  const outstandingOnly =
    req.query.outstandingOnly === '1' || req.query.outstandingOnly === 'true';
  const summaries = await feePaymentService.getFeePaymentSummaries({
    outstandingOnly,
    feeType: typeof req.query.feeType === 'string' ? req.query.feeType : undefined,
  });
  res.json(summaries);
}
