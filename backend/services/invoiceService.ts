import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import type { Invoice, InvoiceFeeType, InvoiceStatus } from '../types/index.js';
import { newId, num, toDateStr, toIso } from '../utils/helpers.js';
import { getWorkerById } from './workerService.js';
import { ensureInvoicePaymentsTable } from './invoicePaymentService.js';

interface InvoiceRow extends RowDataPacket {
  id: string;
  invoice_no: string;
  worker_id: string;
  fee_type: InvoiceFeeType | null;
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
  worker_name: string;
  passport_no: string;
  host_company: string | null;
  supervising_org: string | null;
}

function normalizeFeeType(value: unknown): InvoiceFeeType {
  if (value === 'flight' || value === 'training' || value === 'management') return value;
  return 'management';
}

function mapInvoice(row: InvoiceRow): Invoice {
  return {
    id: row.id,
    invoiceNo: row.invoice_no,
    workerId: row.worker_id,
    workerName: row.worker_name,
    passportNo: row.passport_no,
    hostCompany: row.host_company || '',
    supervisingOrg: row.supervising_org || '',
    feeType: normalizeFeeType(row.fee_type),
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

const INVOICE_SELECT = `
  SELECT i.*,
    w.name AS worker_name, w.passport_no,
    d.host_company, d.supervising_org
  FROM invoices i
  JOIN workers w ON w.id = i.worker_id
  LEFT JOIN deployments d ON d.worker_id = w.id
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

function defaultAmountForFee(
  worker: NonNullable<Awaited<ReturnType<typeof getWorkerById>>>,
  feeType: InvoiceFeeType
): number {
  const cycle = worker.financialConfig.billingCycleMonths || 6;
  if (feeType === 'flight') return num(worker.financialConfig.flightFee);
  if (feeType === 'training') return num(worker.financialConfig.trainingFee);
  return num(worker.financialConfig.managementFee) * cycle;
}

function defaultBillingPeriod(feeType: InvoiceFeeType): string {
  const year = new Date().getFullYear();
  if (feeType === 'flight') return `Flight Fee (One-time)`;
  if (feeType === 'training') return `Training Fee (One-time)`;
  return `${year} Cycle`;
}

export async function listInvoices(filters: {
  status?: string;
  workerId?: string;
  feeType?: string;
  upcoming7Days?: string;
}): Promise<Invoice[]> {
  await ensureInvoicePaymentsTable();
  const where: string[] = [];
  const params: Record<string, string> = {};

  if (filters.status) {
    where.push('i.status = :status');
    params.status = filters.status;
  }
  if (filters.workerId) {
    where.push('i.worker_id = :workerId');
    params.workerId = filters.workerId;
  }
  if (
    filters.feeType === 'management' ||
    filters.feeType === 'flight' ||
    filters.feeType === 'training'
  ) {
    where.push('i.fee_type = :feeType');
    params.feeType = filters.feeType;
  }
  if (filters.upcoming7Days === 'true') {
    where.push(`i.next_invoice_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL 7 DAY)`);
    where.push(`i.status <> 'Paid'`);
    where.push(`i.fee_type = 'management'`);
  }

  const sql = `${INVOICE_SELECT}${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY i.created_at DESC`;
  const [rows] = await pool.query<InvoiceRow[]>(sql, params);
  return rows.map(mapInvoice);
}

export async function createInvoice(body: Partial<Invoice>): Promise<Invoice> {
  if (!body.workerId) throw new AppError('workerId is required');
  const worker = await getWorkerById(body.workerId);
  if (!worker) throw new AppError('Worker invalid or not found');

  const feeType = normalizeFeeType(body.feeType);
  const lastInvoiceDate = body.lastInvoiceDate || new Date().toISOString().split('T')[0];
  const cycleMonths = worker.financialConfig.billingCycleMonths || 6;

  let nextInvoiceDate = body.nextInvoiceDate;
  if (!nextInvoiceDate) {
    if (feeType === 'management') {
      const d = new Date(lastInvoiceDate);
      d.setMonth(d.getMonth() + cycleMonths);
      nextInvoiceDate = d.toISOString().split('T')[0];
    } else {
      // One-time fees: no recurring cycle
      nextInvoiceDate = lastInvoiceDate;
    }
  }

  const totalAmount =
    body.totalAmount !== undefined ? num(body.totalAmount) : defaultAmountForFee(worker, feeType);
  // Payments are recorded via invoice_payments; new invoices start unpaid.
  const amountReceived = 0;
  const outstandingAmount = Math.max(0, totalAmount - amountReceived);
  const status = resolveStatus(totalAmount, amountReceived, outstandingAmount, body.status);

  const [countRows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS c FROM invoices WHERE invoice_no LIKE :prefix',
    { prefix: `INV-${new Date().getFullYear()}-%` }
  );
  const invoiceNo =
    body.invoiceNo ||
    `INV-${new Date().getFullYear()}-${String(Number(countRows[0].c) + 1).padStart(3, '0')}`;

  const id = newId('inv');

  await pool.execute(
    `INSERT INTO invoices
      (id, invoice_no, worker_id, fee_type, billing_period, last_invoice_date, next_invoice_date,
       total_amount, amount_received, outstanding_amount, payment_received_date,
       receipt_no, receipt_sent_date, status, currency, notes)
     VALUES
      (:id, :invoiceNo, :workerId, :feeType, :billingPeriod, :lastInvoiceDate, :nextInvoiceDate,
       :totalAmount, :amountReceived, :outstandingAmount, :paymentReceivedDate,
       :receiptNo, :receiptSentDate, :status, :currency, :notes)`,
    {
      id,
      invoiceNo,
      workerId: worker.id,
      feeType,
      billingPeriod: body.billingPeriod || defaultBillingPeriod(feeType),
      lastInvoiceDate,
      nextInvoiceDate,
      totalAmount,
      amountReceived,
      outstandingAmount,
      paymentReceivedDate: null,
      receiptNo: null,
      receiptSentDate: body.receiptSentDate || null,
      status,
      currency: body.currency || worker.financialConfig.currency || 'JPY',
      notes: body.notes || '',
    }
  );

  const [rows] = await pool.query<InvoiceRow[]>(`${INVOICE_SELECT} WHERE i.id = :id LIMIT 1`, { id });
  return mapInvoice(rows[0]);
}

export async function updateInvoice(id: string, body: Partial<Invoice>): Promise<Invoice> {
  const [existingRows] = await pool.query<InvoiceRow[]>(
    `${INVOICE_SELECT} WHERE i.id = :id LIMIT 1`,
    { id }
  );
  if (!existingRows[0]) throw new AppError('Invoice not found', 404);
  const existing = mapInvoice(existingRows[0]);

  const feeType =
    body.feeType !== undefined ? normalizeFeeType(body.feeType) : existing.feeType;
  const totalAmount =
    body.totalAmount !== undefined ? num(body.totalAmount) : existing.totalAmount;
  // Keep payment totals driven by invoice_payments (recompute after total change).
  const { recomputeInvoiceTotals } = await import('./invoicePaymentService.js');

  await pool.execute(
    `UPDATE invoices SET
      invoice_no = :invoiceNo, fee_type = :feeType, billing_period = :billingPeriod,
      last_invoice_date = :lastInvoiceDate, next_invoice_date = :nextInvoiceDate,
      total_amount = :totalAmount,
      receipt_sent_date = :receiptSentDate,
      currency = :currency, notes = :notes
     WHERE id = :id`,
    {
      id,
      invoiceNo: body.invoiceNo ?? existing.invoiceNo,
      feeType,
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

  await recomputeInvoiceTotals(id);

  const [rows] = await pool.query<InvoiceRow[]>(`${INVOICE_SELECT} WHERE i.id = :id LIMIT 1`, { id });
  return mapInvoice(rows[0]);
}

export async function deleteInvoice(id: string): Promise<void> {
  const [result] = await pool.execute<ResultSetHeader>('DELETE FROM invoices WHERE id = :id', { id });
  if (result.affectedRows === 0) throw new AppError('Invoice not found', 404);
}
