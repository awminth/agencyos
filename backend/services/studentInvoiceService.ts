import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import type { InvoiceStatus, StudentInvoice } from '../types/index.js';
import { newId, num, toDateStr, toIso } from '../utils/helpers.js';
import { getStudentById } from './studentService.js';
import { ensureStudentInvoicePaymentsTable } from './studentInvoicePaymentService.js';

interface StudentInvoiceRow extends RowDataPacket {
  id: string;
  invoice_no: string;
  student_id: string;
  fee_type: 'introduction' | null;
  billing_period: string;
  last_invoice_date: string;
  next_invoice_date: string;
  total_amount: number;
  amount_received: number;
  outstanding_amount: number;
  payment_received_date: string | null;
  receipt_no: string | null;
  receipt_sent_date: string | null;
  status: InvoiceStatus;
  currency: 'JPY' | 'MMK' | 'USD';
  notes: string | null;
  created_at: string;
  student_name: string;
  passport_no: string;
  host_company: string | null;
  supervising_org: string | null;
}

function mapStudentInvoice(row: StudentInvoiceRow): StudentInvoice {
  return {
    id: row.id,
    invoiceNo: row.invoice_no,
    studentId: row.student_id,
    studentName: row.student_name,
    passportNo: row.passport_no,
    hostCompany: row.host_company || '',
    supervisingOrg: row.supervising_org || '',
    feeType: 'introduction',
    billingPeriod: row.billing_period,
    lastInvoiceDate: toDateStr(row.last_invoice_date),
    nextInvoiceDate: toDateStr(row.next_invoice_date),
    totalAmount: num(row.total_amount),
    amountReceived: num(row.amount_received),
    outstandingAmount: num(row.outstanding_amount),
    paymentReceivedDate: row.payment_received_date
      ? toDateStr(row.payment_received_date)
      : undefined,
    receiptNo: row.receipt_no || undefined,
    receiptSentDate: row.receipt_sent_date ? toDateStr(row.receipt_sent_date) : undefined,
    status: row.status,
    currency: row.currency || 'JPY',
    notes: row.notes || '',
    createdAt: toIso(row.created_at),
  };
}

const STUDENT_INVOICE_SELECT = `
  SELECT i.*,
    s.name AS student_name, s.passport_no,
    d.host_company, d.supervising_org
  FROM student_invoices i
  JOIN students s ON s.id = i.student_id
  LEFT JOIN student_deployments d ON d.student_id = s.id
`;

function resolveStatus(
  totalAmount: number,
  amountReceived: number,
  outstanding: number,
  explicit?: InvoiceStatus
): InvoiceStatus {
  if (explicit) return explicit;
  if (outstanding === 0 && totalAmount > 0) return 'Paid';
  if (amountReceived > 0) return 'Partial';
  return 'Pending';
}

export async function listStudentInvoices(filters: {
  status?: string;
  studentId?: string;
  feeType?: string;
  upcoming7Days?: string;
}): Promise<StudentInvoice[]> {
  await ensureStudentInvoicePaymentsTable();
  const where: string[] = [];
  const params: Record<string, string> = {};

  if (filters.status) {
    where.push('i.status = :status');
    params.status = filters.status;
  }
  if (filters.studentId) {
    where.push('i.student_id = :studentId');
    params.studentId = filters.studentId;
  }
  if (filters.feeType === 'introduction') {
    where.push(`i.fee_type = 'introduction'`);
  }
  if (filters.upcoming7Days === 'true') {
    where.push(`i.next_invoice_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)`);
    where.push(`i.status <> 'Paid'`);
  }

  const sql = `${STUDENT_INVOICE_SELECT}${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY i.created_at DESC`;
  const [rows] = await pool.query<StudentInvoiceRow[]>(sql, params);
  return rows.map(mapStudentInvoice);
}

export async function getStudentInvoiceById(id: string): Promise<StudentInvoice> {
  await ensureStudentInvoicePaymentsTable();
  const [rows] = await pool.query<StudentInvoiceRow[]>(
    `${STUDENT_INVOICE_SELECT} WHERE i.id = :id LIMIT 1`,
    { id }
  );
  if (!rows[0]) throw new AppError('Invoice not found', 404);
  return mapStudentInvoice(rows[0]);
}

export async function createStudentInvoice(body: Partial<StudentInvoice>): Promise<StudentInvoice> {
  if (!body.studentId) throw new AppError('studentId is required');
  const student = await getStudentById(body.studentId);
  if (!student) throw new AppError('Student invalid or not found');

  const lastInvoiceDate = body.lastInvoiceDate || new Date().toISOString().split('T')[0];
  const nextInvoiceDate = body.nextInvoiceDate || lastInvoiceDate;
  const totalAmount =
    body.totalAmount !== undefined
      ? num(body.totalAmount)
      : num(student.financialConfig.introductionFee);
  const amountReceived = 0;
  const outstandingAmount = Math.max(0, totalAmount - amountReceived);
  const status = resolveStatus(totalAmount, amountReceived, outstandingAmount, body.status);

  const [countRows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS c FROM student_invoices WHERE invoice_no LIKE :prefix',
    { prefix: `SINV-${new Date().getFullYear()}-%` }
  );
  const invoiceNo =
    body.invoiceNo ||
    `SINV-${new Date().getFullYear()}-${String(Number(countRows[0].c) + 1).padStart(3, '0')}`;

  const id = newId('sinv');

  await pool.execute(
    `INSERT INTO student_invoices
      (id, invoice_no, student_id, fee_type, billing_period, last_invoice_date, next_invoice_date,
       total_amount, amount_received, outstanding_amount, payment_received_date,
       receipt_no, receipt_sent_date, status, currency, notes)
     VALUES
      (:id, :invoiceNo, :studentId, 'introduction', :billingPeriod, :lastInvoiceDate, :nextInvoiceDate,
       :totalAmount, :amountReceived, :outstandingAmount, :paymentReceivedDate,
       :receiptNo, :receiptSentDate, :status, :currency, :notes)`,
    {
      id,
      invoiceNo,
      studentId: student.id,
      billingPeriod: body.billingPeriod || 'Introduction Fee (One-time)',
      lastInvoiceDate,
      nextInvoiceDate,
      totalAmount,
      amountReceived,
      outstandingAmount,
      paymentReceivedDate: null,
      receiptNo: null,
      receiptSentDate: body.receiptSentDate || null,
      status,
      currency: body.currency || 'JPY',
      notes: body.notes || '',
    }
  );

  return getStudentInvoiceById(id);
}

export async function updateStudentInvoice(
  id: string,
  body: Partial<StudentInvoice>
): Promise<StudentInvoice> {
  const existing = await getStudentInvoiceById(id);
  const totalAmount =
    body.totalAmount !== undefined ? num(body.totalAmount) : existing.totalAmount;
  const { recomputeStudentInvoiceTotals } = await import('./studentInvoicePaymentService.js');

  await pool.execute(
    `UPDATE student_invoices SET
      invoice_no = :invoiceNo, fee_type = 'introduction', billing_period = :billingPeriod,
      last_invoice_date = :lastInvoiceDate, next_invoice_date = :nextInvoiceDate,
      total_amount = :totalAmount,
      receipt_sent_date = :receiptSentDate,
      currency = :currency, notes = :notes
     WHERE id = :id`,
    {
      id,
      invoiceNo: body.invoiceNo ?? existing.invoiceNo,
      billingPeriod: body.billingPeriod ?? existing.billingPeriod,
      lastInvoiceDate: body.lastInvoiceDate ?? existing.lastInvoiceDate,
      nextInvoiceDate: body.nextInvoiceDate ?? existing.nextInvoiceDate,
      totalAmount,
      receiptSentDate:
        body.receiptSentDate !== undefined
          ? body.receiptSentDate || null
          : existing.receiptSentDate || null,
      currency: body.currency ?? existing.currency,
      notes: body.notes ?? existing.notes ?? '',
    }
  );

  await recomputeStudentInvoiceTotals(id);
  return getStudentInvoiceById(id);
}

export async function deleteStudentInvoice(id: string): Promise<void> {
  const [result] = await pool.execute<ResultSetHeader>(
    'DELETE FROM student_invoices WHERE id = :id',
    { id }
  );
  if (result.affectedRows === 0) throw new AppError('Invoice not found', 404);
}
