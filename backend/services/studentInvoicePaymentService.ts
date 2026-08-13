import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import type { InvoiceStatus, StudentInvoicePayment } from '../types/index.js';
import { newId, num, toDateStr, toIso } from '../utils/helpers.js';
import { calcAmountDue } from '../utils/invoiceTax.js';

interface StudentPaymentRow extends RowDataPacket {
  id: string;
  invoice_id: string;
  amount: number;
  payment_date: string;
  receipt_no: string | null;
  notes: string | null;
  currency: 'JPY' | 'MMK' | 'USD';
  created_at: string;
  invoice_no?: string;
  student_id?: string;
  student_name?: string;
  fee_type?: 'introduction' | null;
}

let ensured = false;

function mapPayment(row: StudentPaymentRow): StudentInvoicePayment {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    invoiceNo: row.invoice_no,
    studentId: row.student_id,
    studentName: row.student_name,
    feeType: row.fee_type === 'introduction' ? row.fee_type : undefined,
    amount: num(row.amount),
    paymentDate: toDateStr(row.payment_date),
    receiptNo: row.receipt_no || undefined,
    notes: row.notes || undefined,
    currency: row.currency || 'JPY',
    createdAt: toIso(row.created_at),
  };
}

export async function ensureStudentInvoicePaymentsTable(): Promise<void> {
  if (ensured) return;
  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_invoice_payments (
      id VARCHAR(64) PRIMARY KEY,
      invoice_id VARCHAR(64) NOT NULL,
      amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      payment_date DATE NOT NULL,
      receipt_no VARCHAR(50) NULL,
      notes TEXT NULL,
      currency ENUM('JPY', 'MMK', 'USD') NOT NULL DEFAULT 'JPY',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (invoice_id) REFERENCES student_invoices(id) ON DELETE CASCADE
    )
  `);
  try {
    await pool.query(
      `CREATE INDEX idx_student_invoice_payments_invoice ON student_invoice_payments(invoice_id)`
    );
  } catch {
    // index may already exist
  }
  ensured = true;
}

function resolveStatus(totalAmount: number, amountReceived: number): InvoiceStatus {
  const outstanding = Math.max(0, totalAmount - amountReceived);
  if (outstanding === 0 && totalAmount > 0) return 'Paid';
  if (amountReceived > 0) return 'Partial';
  return 'Pending';
}

export async function recomputeStudentInvoiceTotals(invoiceId: string): Promise<void> {
  await ensureStudentInvoicePaymentsTable();
  const [invRows] = await pool.query<RowDataPacket[]>(
    `SELECT id, total_amount, COALESCE(tax_rate, 0) AS tax_rate FROM student_invoices WHERE id = :id LIMIT 1`,
    { id: invoiceId }
  );
  if (!invRows[0]) throw new AppError('Invoice not found', 404);

  const [sumRows] = await pool.query<RowDataPacket[]>(
    `SELECT
       COALESCE(SUM(amount), 0) AS totalReceived,
       MAX(payment_date) AS lastPaymentDate,
       (SELECT receipt_no FROM student_invoice_payments
         WHERE invoice_id = :id ORDER BY payment_date DESC, created_at DESC LIMIT 1) AS lastReceipt
     FROM student_invoice_payments
     WHERE invoice_id = :id`,
    { id: invoiceId }
  );

  const amountDue = calcAmountDue(num(invRows[0].total_amount), num(invRows[0].tax_rate));
  const amountReceived = num(sumRows[0]?.totalReceived);
  const outstandingAmount = Math.max(0, amountDue - amountReceived);
  const status = resolveStatus(amountDue, amountReceived);

  await pool.execute(
    `UPDATE student_invoices SET
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

export async function listStudentPaymentsByInvoice(
  invoiceId: string
): Promise<StudentInvoicePayment[]> {
  await ensureStudentInvoicePaymentsTable();
  const [rows] = await pool.query<StudentPaymentRow[]>(
    `SELECT p.*, i.invoice_no, i.student_id, i.school_name, i.fee_type,
            COALESCE(s.name, i.school_name) AS student_name
     FROM student_invoice_payments p
     JOIN student_invoices i ON i.id = p.invoice_id
     LEFT JOIN students s ON s.id = i.student_id
     WHERE p.invoice_id = :invoiceId
     ORDER BY p.payment_date DESC, p.created_at DESC`,
    { invoiceId }
  );
  return rows.map(mapPayment);
}

export async function listStudentPaymentsByStudent(
  studentId: string
): Promise<StudentInvoicePayment[]> {
  await ensureStudentInvoicePaymentsTable();
  const [rows] = await pool.query<StudentPaymentRow[]>(
    `SELECT p.*, i.invoice_no, i.student_id, i.fee_type,
            COALESCE(s.name, i.school_name) AS student_name
     FROM student_invoice_payments p
     JOIN student_invoices i ON i.id = p.invoice_id
     LEFT JOIN students s ON s.id = i.student_id
     WHERE i.fee_type = 'introduction'
       AND (
         i.student_id = :studentId
         OR EXISTS (
           SELECT 1 FROM student_invoice_lines l
           WHERE l.invoice_id = i.id AND l.student_id = :studentId
         )
       )
     ORDER BY p.payment_date DESC, p.created_at DESC`,
    { studentId }
  );
  return rows.map(mapPayment);
}

export async function listStudentPaymentsBySchool(
  schoolName: string
): Promise<StudentInvoicePayment[]> {
  await ensureStudentInvoicePaymentsTable();
  const [rows] = await pool.query<StudentPaymentRow[]>(
    `SELECT p.*, i.invoice_no, i.student_id, i.fee_type,
            COALESCE(i.school_name, s.name) AS student_name
     FROM student_invoice_payments p
     JOIN student_invoices i ON i.id = p.invoice_id
     LEFT JOIN students s ON s.id = i.student_id
     WHERE i.school_name = :schoolName AND i.fee_type = 'introduction'
     ORDER BY p.payment_date DESC, p.created_at DESC`,
    { schoolName }
  );
  return rows.map(mapPayment);
}

export async function getStudentPaymentById(id: string): Promise<StudentInvoicePayment> {
  await ensureStudentInvoicePaymentsTable();
  const [rows] = await pool.query<StudentPaymentRow[]>(
    `SELECT p.*, i.invoice_no, i.student_id, i.fee_type,
            COALESCE(s.name, i.school_name) AS student_name
     FROM student_invoice_payments p
     JOIN student_invoices i ON i.id = p.invoice_id
     LEFT JOIN students s ON s.id = i.student_id
     WHERE p.id = :id
     LIMIT 1`,
    { id }
  );
  if (!rows[0]) throw new AppError('Payment voucher not found', 404);
  return mapPayment(rows[0]);
}

export async function createStudentPayment(
  invoiceId: string,
  body: Partial<StudentInvoicePayment>
): Promise<StudentInvoicePayment> {
  await ensureStudentInvoicePaymentsTable();
  const [invRows] = await pool.query<RowDataPacket[]>(
    `SELECT id, currency, total_amount, COALESCE(tax_rate, 0) AS tax_rate,
            COALESCE(amount_received, 0) AS amount_received
     FROM student_invoices WHERE id = :id LIMIT 1`,
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

  const id = newId('spay');
  const paymentDate = body.paymentDate || new Date().toISOString().split('T')[0];

  await pool.execute(
    `INSERT INTO student_invoice_payments
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

  await recomputeStudentInvoiceTotals(invoiceId);
  return getStudentPaymentById(id);
}

export async function deleteStudentPayment(id: string): Promise<void> {
  await ensureStudentInvoicePaymentsTable();
  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT invoice_id FROM student_invoice_payments WHERE id = :id LIMIT 1`,
    { id }
  );
  if (!rows[0]) throw new AppError('Payment voucher not found', 404);
  const invoiceId = String(rows[0].invoice_id);

  const [result] = await pool.execute<ResultSetHeader>(
    `DELETE FROM student_invoice_payments WHERE id = :id`,
    { id }
  );
  if (result.affectedRows === 0) throw new AppError('Payment voucher not found', 404);

  await recomputeStudentInvoiceTotals(invoiceId);
}
