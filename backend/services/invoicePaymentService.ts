import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import type { InvoiceFeeType, InvoicePayment, InvoiceStatus } from '../types/index.js';
import { newId, num, toDateStr, toIso } from '../utils/helpers.js';
import { calcAmountDue } from '../utils/invoiceTax.js';

interface PaymentRow extends RowDataPacket {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  receipt_no: string | null;
  notes: string | null;
  currency: 'JPY' | 'MMK' | 'USD';
  created_at: string;
  invoice_no?: string;
  worker_id?: string;
  worker_name?: string;
  fee_type?: InvoiceFeeType | null;
}

let ensured = false;

function mapPayment(row: PaymentRow): InvoicePayment {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    invoiceNo: row.invoice_no,
    workerId: row.worker_id,
    workerName: row.worker_name,
    feeType:
      row.fee_type === 'flight' || row.fee_type === 'training' || row.fee_type === 'management'
        ? row.fee_type
        : undefined,
    amount: num(row.amount),
    paymentDate: toDateStr(row.payment_date),
    receiptNo: row.receipt_no || undefined,
    notes: row.notes || undefined,
    currency: row.currency || 'JPY',
    createdAt: toIso(row.created_at),
  };
}

export async function ensureInvoicePaymentsTable(): Promise<void> {
  if (ensured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS invoice_payments (
      id VARCHAR(64) PRIMARY KEY,
      invoice_id VARCHAR(64) NOT NULL,
      amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      payment_date DATE NOT NULL,
      receipt_no VARCHAR(50) NULL,
      notes TEXT NULL,
      currency ENUM('JPY', 'MMK', 'USD') NOT NULL DEFAULT 'JPY',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
    )
  `);
  try {
    await pool.query(`CREATE INDEX idx_invoice_payments_invoice ON invoice_payments(invoice_id)`);
  } catch {
    // index may already exist
  }
  await seedLegacyInvoicePayments();
  ensured = true;
}

/** One voucher per invoice that already had amount_received but no payment rows. */
async function seedLegacyInvoicePayments(): Promise<void> {
  const [rows] = await pool.query<RowDataPacket[]>(`
    SELECT i.id, i.amount_received, i.payment_received_date, i.receipt_no, i.currency, i.notes, i.created_at
    FROM invoices i
    WHERE COALESCE(i.amount_received, 0) > 0
      AND NOT EXISTS (
        SELECT 1 FROM invoice_payments p WHERE p.invoice_id = i.id
      )
  `);

  for (const row of rows) {
    const amount = num(row.amount_received);
    if (amount <= 0) continue;
    const id = newId('ipay');
    const paymentDate =
      toDateStr(row.payment_received_date) ||
      toDateStr(row.created_at) ||
      new Date().toISOString().split('T')[0];
    await pool.execute(
      `INSERT INTO invoice_payments
        (id, invoice_id, amount, payment_date, receipt_no, notes, currency)
       VALUES
        (:id, :invoiceId, :amount, :paymentDate, :receiptNo, :notes, :currency)`,
      {
        id,
        invoiceId: row.id,
        amount,
        paymentDate,
        receiptNo: row.receipt_no || null,
        notes: row.notes || 'Migrated from invoice amount_received',
        currency: row.currency || 'JPY',
      }
    );
  }
}

function resolveStatus(totalAmount: number, amountReceived: number): InvoiceStatus {
  const outstanding = Math.max(0, totalAmount - amountReceived);
  if (outstanding === 0 && totalAmount > 0) return 'Paid';
  if (amountReceived > 0) return 'Partial';
  return 'Pending';
}

export async function recomputeInvoiceTotals(invoiceId: string): Promise<void> {
  await ensureInvoicePaymentsTable();
  const [invRows] = await pool.query<RowDataPacket[]>(
    `SELECT id, total_amount, COALESCE(tax_rate, 0) AS tax_rate FROM invoices WHERE id = :id LIMIT 1`,
    { id: invoiceId }
  );
  if (!invRows[0]) throw new AppError('Invoice not found', 404);

  const [sumRows] = await pool.query<RowDataPacket[]>(
    `SELECT
       COALESCE(SUM(amount), 0) AS totalReceived,
       MAX(payment_date) AS lastPaymentDate,
       (SELECT receipt_no FROM invoice_payments
         WHERE invoice_id = :id ORDER BY payment_date DESC, created_at DESC LIMIT 1) AS lastReceipt
     FROM invoice_payments
     WHERE invoice_id = :id`,
    { id: invoiceId }
  );

  const amountDue = calcAmountDue(num(invRows[0].total_amount), num(invRows[0].tax_rate));
  const amountReceived = num(sumRows[0]?.totalReceived);
  const outstandingAmount = Math.max(0, amountDue - amountReceived);
  const status = resolveStatus(amountDue, amountReceived);

  await pool.execute(
    `UPDATE invoices SET
       amount_received = :amountReceived,
       outstanding_amount = :outstandingAmount,
       payment_received_date = :paymentReceivedDate,
       receipt_no = :receiptNo,
       status = :status
     WHERE id = :id`,
    {
      id: invoiceId,
      amountReceived,
      outstandingAmount,
      paymentReceivedDate: sumRows[0]?.lastPaymentDate
        ? toDateStr(sumRows[0].lastPaymentDate)
        : null,
      receiptNo: sumRows[0]?.lastReceipt || null,
      status,
    }
  );
}

export async function listPaymentsByInvoice(invoiceId: string): Promise<InvoicePayment[]> {
  await ensureInvoicePaymentsTable();
  const [rows] = await pool.query<PaymentRow[]>(
    `SELECT p.*, i.invoice_no, i.worker_id, i.fee_type,
            COALESCE(w.name, i.host_company) AS worker_name
     FROM invoice_payments p
     JOIN invoices i ON i.id = p.invoice_id
     LEFT JOIN workers w ON w.id = i.worker_id
     WHERE p.invoice_id = :invoiceId
     ORDER BY p.payment_date DESC, p.created_at DESC`,
    { invoiceId }
  );
  return rows.map(mapPayment);
}

export async function listPaymentsByWorkerFee(
  workerId: string,
  feeType: InvoiceFeeType
): Promise<InvoicePayment[]> {
  await ensureInvoicePaymentsTable();
  const [rows] = await pool.query<PaymentRow[]>(
    `SELECT p.*, i.invoice_no, i.worker_id, i.fee_type,
            COALESCE(w.name, i.host_company) AS worker_name
     FROM invoice_payments p
     JOIN invoices i ON i.id = p.invoice_id
     LEFT JOIN workers w ON w.id = i.worker_id
     WHERE i.fee_type = :feeType
       AND (
         i.worker_id = :workerId
         OR EXISTS (
           SELECT 1 FROM invoice_lines l
           WHERE l.invoice_id = i.id AND l.worker_id = :workerId
         )
       )
     ORDER BY p.payment_date DESC, p.created_at DESC`,
    { workerId, feeType }
  );
  return rows.map(mapPayment);
}

export async function listPaymentsByHostFee(
  hostCompany: string,
  feeType: InvoiceFeeType
): Promise<InvoicePayment[]> {
  await ensureInvoicePaymentsTable();
  const [rows] = await pool.query<PaymentRow[]>(
    `SELECT p.*, i.invoice_no, i.worker_id, i.fee_type,
            COALESCE(i.host_company, w.name) AS worker_name
     FROM invoice_payments p
     JOIN invoices i ON i.id = p.invoice_id
     LEFT JOIN workers w ON w.id = i.worker_id
     WHERE i.host_company = :hostCompany AND i.fee_type = :feeType
     ORDER BY p.payment_date DESC, p.created_at DESC`,
    { hostCompany, feeType }
  );
  return rows.map(mapPayment);
}

export async function getPaymentById(id: string): Promise<InvoicePayment> {
  await ensureInvoicePaymentsTable();
  const [rows] = await pool.query<PaymentRow[]>(
    `SELECT p.*, i.invoice_no, i.worker_id, i.fee_type,
            COALESCE(w.name, i.host_company) AS worker_name
     FROM invoice_payments p
     JOIN invoices i ON i.id = p.invoice_id
     LEFT JOIN workers w ON w.id = i.worker_id
     WHERE p.id = :id
     LIMIT 1`,
    { id }
  );
  if (!rows[0]) throw new AppError('Payment voucher not found', 404);
  return mapPayment(rows[0]);
}

export async function createPayment(
  invoiceId: string,
  body: Partial<InvoicePayment>
): Promise<InvoicePayment> {
  await ensureInvoicePaymentsTable();
  const [invRows] = await pool.query<RowDataPacket[]>(
    `SELECT id, currency, total_amount, COALESCE(tax_rate, 0) AS tax_rate,
            COALESCE(amount_received, 0) AS amount_received
     FROM invoices WHERE id = :id LIMIT 1`,
    { id: invoiceId }
  );
  if (!invRows[0]) throw new AppError('Invoice not found', 404);

  const amount = num(body.amount);
  if (amount <= 0) throw new AppError('Payment amount must be greater than 0');

  const amountDue = calcAmountDue(num(invRows[0].total_amount), num(invRows[0].tax_rate));
  const alreadyReceived = num(invRows[0].amount_received);
  const outstanding = Math.max(0, amountDue - alreadyReceived);
  if (outstanding <= 0 && amountDue > 0) {
    throw new AppError('This invoice is already fully paid');
  }
  if (amountDue > 0 && amount > outstanding + 0.009) {
    throw new AppError(
      `Amount exceeds outstanding balance (${outstanding.toLocaleString()} ${
        body.currency || invRows[0].currency || 'JPY'
      })`
    );
  }

  const id = newId('ipay');
  const paymentDate = body.paymentDate || new Date().toISOString().split('T')[0];

  await pool.execute(
    `INSERT INTO invoice_payments
      (id, invoice_id, amount, payment_date, receipt_no, notes, currency)
     VALUES
      (:id, :invoiceId, :amount, :paymentDate, :receiptNo, :notes, :currency)`,
    {
      id,
      invoiceId,
      amount,
      paymentDate,
      receiptNo: body.receiptNo || null,
      notes: body.notes || '',
      currency: body.currency || invRows[0].currency || 'JPY',
    }
  );

  await recomputeInvoiceTotals(invoiceId);
  return getPaymentById(id);
}

export async function deletePayment(id: string): Promise<void> {
  await ensureInvoicePaymentsTable();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT invoice_id FROM invoice_payments WHERE id = :id LIMIT 1`,
    { id }
  );
  if (!rows[0]) throw new AppError('Payment voucher not found', 404);
  const invoiceId = String(rows[0].invoice_id);

  const [result] = await pool.execute<ResultSetHeader>(
    `DELETE FROM invoice_payments WHERE id = :id`,
    { id }
  );
  if (result.affectedRows === 0) throw new AppError('Payment voucher not found', 404);

  await recomputeInvoiceTotals(invoiceId);
}
