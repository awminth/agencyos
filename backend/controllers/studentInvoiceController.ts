import type { Request, Response } from 'express';
import * as studentInvoiceService from '../services/studentInvoiceService.js';
import * as studentInvoicePaymentService from '../services/studentInvoicePaymentService.js';

export async function list(req: Request, res: Response): Promise<void> {
  const invoices = await studentInvoiceService.listStudentInvoices({
    status: typeof req.query.status === 'string' ? req.query.status : undefined,
    studentId: typeof req.query.studentId === 'string' ? req.query.studentId : undefined,
    schoolName: typeof req.query.schoolName === 'string' ? req.query.schoolName : undefined,
    feeType: typeof req.query.feeType === 'string' ? req.query.feeType : undefined,
    upcoming7Days:
      typeof req.query.upcoming7Days === 'string' ? req.query.upcoming7Days : undefined,
  });
  res.json(invoices);
}

export async function create(req: Request, res: Response): Promise<void> {
  const invoice = await studentInvoiceService.createStudentInvoice(req.body);
  res.status(201).json(invoice);
}

export async function getById(req: Request, res: Response): Promise<void> {
  res.json(await studentInvoiceService.getStudentInvoiceById(req.params.id));
}

export async function update(req: Request, res: Response): Promise<void> {
  const invoice = await studentInvoiceService.updateStudentInvoice(req.params.id, req.body);
  res.json(invoice);
}

export async function remove(req: Request, res: Response): Promise<void> {
  await studentInvoiceService.deleteStudentInvoice(req.params.id);
  res.json({ success: true, message: 'Invoice deleted' });
}

export async function listPayments(req: Request, res: Response): Promise<void> {
  const studentId = typeof req.query.studentId === 'string' ? req.query.studentId : undefined;
  const schoolName = typeof req.query.schoolName === 'string' ? req.query.schoolName : undefined;

  if (req.params.id === 'by-student' && studentId) {
    res.json(await studentInvoicePaymentService.listStudentPaymentsByStudent(studentId));
    return;
  }

  if (req.params.id === 'by-school' && schoolName) {
    res.json(await studentInvoicePaymentService.listStudentPaymentsBySchool(schoolName));
    return;
  }

  res.json(await studentInvoicePaymentService.listStudentPaymentsByInvoice(req.params.id));
}

export async function createPayment(req: Request, res: Response): Promise<void> {
  const payment = await studentInvoicePaymentService.createStudentPayment(req.params.id, req.body);
  res.status(201).json(payment);
}

export async function getPayment(req: Request, res: Response): Promise<void> {
  res.json(await studentInvoicePaymentService.getStudentPaymentById(req.params.paymentId));
}

export async function removePayment(req: Request, res: Response): Promise<void> {
  await studentInvoicePaymentService.deleteStudentPayment(req.params.paymentId);
  res.json({ success: true, message: 'Payment voucher deleted' });
}
