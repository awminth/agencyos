import type { Request, Response } from 'express';
import * as invoiceService from '../services/invoiceService.js';
import * as invoicePaymentService from '../services/invoicePaymentService.js';

export async function list(req: Request, res: Response): Promise<void> {
  const invoices = await invoiceService.listInvoices({
    status: typeof req.query.status === 'string' ? req.query.status : undefined,
    workerId: typeof req.query.workerId === 'string' ? req.query.workerId : undefined,
    hostCompany: typeof req.query.hostCompany === 'string' ? req.query.hostCompany : undefined,
    supervisingOrg:
      typeof req.query.supervisingOrg === 'string' ? req.query.supervisingOrg : undefined,
    feeType: typeof req.query.feeType === 'string' ? req.query.feeType : undefined,
    upcoming7Days:
      typeof req.query.upcoming7Days === 'string' ? req.query.upcoming7Days : undefined,
  });
  res.json(invoices);
}

export async function create(req: Request, res: Response): Promise<void> {
  const invoice = await invoiceService.createInvoice(req.body);
  res.status(201).json(invoice);
}

export async function update(req: Request, res: Response): Promise<void> {
  const invoice = await invoiceService.updateInvoice(req.params.id, req.body);
  res.json(invoice);
}

export async function remove(req: Request, res: Response): Promise<void> {
  await invoiceService.deleteInvoice(req.params.id);
  res.json({ success: true, message: 'Invoice deleted' });
}

export async function listPayments(req: Request, res: Response): Promise<void> {
  const workerId = typeof req.query.workerId === 'string' ? req.query.workerId : undefined;
  const hostCompany = typeof req.query.hostCompany === 'string' ? req.query.hostCompany : undefined;
  const feeType = typeof req.query.feeType === 'string' ? req.query.feeType : undefined;

  if (
    req.params.id === 'by-worker' &&
    workerId &&
    (feeType === 'management' || feeType === 'flight' || feeType === 'training')
  ) {
    res.json(await invoicePaymentService.listPaymentsByWorkerFee(workerId, feeType));
    return;
  }

  if (
    req.params.id === 'by-host' &&
    hostCompany &&
    (feeType === 'management' || feeType === 'flight' || feeType === 'training')
  ) {
    res.json(await invoicePaymentService.listPaymentsByHostFee(hostCompany, feeType));
    return;
  }

  res.json(await invoicePaymentService.listPaymentsByInvoice(req.params.id));
}

export async function createPayment(req: Request, res: Response): Promise<void> {
  const payment = await invoicePaymentService.createPayment(req.params.id, req.body);
  res.status(201).json(payment);
}

export async function getPayment(req: Request, res: Response): Promise<void> {
  res.json(await invoicePaymentService.getPaymentById(req.params.paymentId));
}

export async function removePayment(req: Request, res: Response): Promise<void> {
  await invoicePaymentService.deletePayment(req.params.paymentId);
  res.json({ success: true, message: 'Payment voucher deleted' });
}
