import type { Request, Response } from 'express';
import * as reportService from '../services/reportService.js';

export async function upcomingInvoices(_req: Request, res: Response): Promise<void> {
  res.json(await reportService.getUpcomingInvoicesReport());
}

export async function outstandingBalances(_req: Request, res: Response): Promise<void> {
  res.json(await reportService.getOutstandingBalancesReport());
}

export async function contractExpirations(_req: Request, res: Response): Promise<void> {
  res.json(await reportService.getContractExpirationsReport());
}

export async function feePayments(req: Request, res: Response): Promise<void> {
  const outstandingOnly =
    req.query.outstandingOnly === '1' || req.query.outstandingOnly === 'true';
  res.json(
    await reportService.getFeePaymentsReport({
      outstandingOnly,
      feeType: typeof req.query.feeType === 'string' ? req.query.feeType : undefined,
    })
  );
}

export async function studentFeePayments(_req: Request, res: Response): Promise<void> {
  res.json(await reportService.getStudentFeePaymentsReport());
}
