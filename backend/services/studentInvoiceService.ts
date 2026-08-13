import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import type { InvoiceStatus, StudentInvoice, StudentInvoiceLine } from '../types/index.js';
import { newId, num, toDateStr, toIso } from '../utils/helpers.js';
import { calcAmountDue, calcTaxAmount, normalizeTaxRate } from '../utils/invoiceTax.js';
import { resolveFormalInvoiceFields } from '../utils/formalInvoiceFields.js';
import { ensureStudentInvoicePaymentsTable } from './studentInvoicePaymentService.js';

interface StudentInvoiceRow extends RowDataPacket {
  id: string;
  invoice_no: string;
  student_id: string | null;
  school_name: string | null;
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
  billed_to_attn?: string | null;
  subject?: string | null;
  tax_rate?: number | string | null;
  bank_account_id?: string | null;
  bank_name?: string | null;
  branch_code?: string | null;
  branch_name?: string | null;
  account_number?: string | null;
  account_holder?: string | null;
  created_at: string;
  legacy_student_name: string | null;
  legacy_passport_no: string | null;
  legacy_host_company: string | null;
  legacy_supervising_org: string | null;
}

interface LineRow extends RowDataPacket {
  id: string;
  invoice_id: string;
  student_id: string;
  amount: number;
  student_name: string;
  serial_no: string | null;
  passport_no: string | null;
}

interface SchoolStudentRow extends RowDataPacket {
  id: string;
  name: string;
  serial_no: string;
  passport_no: string;
  introduction_fee: number;
  host_company: string | null;
}

let schemaEnsured = false;

/** Migrate student_invoices to school-based billing + line items. */
export async function ensureSchoolInvoiceSchema(): Promise<void> {
  if (schemaEnsured) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS student_invoice_lines (
      id VARCHAR(64) PRIMARY KEY,
      invoice_id VARCHAR(64) NOT NULL,
      student_id VARCHAR(64) NOT NULL,
      amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      UNIQUE KEY uq_student_invoice_line (invoice_id, student_id),
      KEY idx_student_invoice_lines_invoice (invoice_id),
      KEY idx_student_invoice_lines_student (student_id)
    )
  `);

  try {
    await pool.query(
      `ALTER TABLE student_invoices ADD COLUMN school_name VARCHAR(150) NULL AFTER student_id`
    );
  } catch (err: any) {
    if (err?.code !== 'ER_DUP_FIELDNAME' && err?.errno !== 1060) {
      // ignore
    }
  }

  try {
    await pool.query(`ALTER TABLE student_invoices MODIFY student_id VARCHAR(64) NULL`);
  } catch {
    // ignore
  }

  // Backfill school_name from deployment for legacy per-student invoices
  try {
    await pool.query(`
      UPDATE student_invoices i
      LEFT JOIN student_deployments d ON d.student_id = i.student_id
      SET i.school_name = COALESCE(NULLIF(i.school_name, ''), d.supervising_org)
      WHERE i.school_name IS NULL OR i.school_name = ''
    `);
  } catch {
    // ignore
  }

  // Backfill line items for legacy invoices that still have student_id
  try {
    await pool.query(`
      INSERT IGNORE INTO student_invoice_lines (id, invoice_id, student_id, amount)
      SELECT CONCAT('sil-', i.id), i.id, i.student_id, i.total_amount
      FROM student_invoices i
      WHERE i.student_id IS NOT NULL
        AND NOT EXISTS (
          SELECT 1 FROM student_invoice_lines l WHERE l.invoice_id = i.id
        )
    `);
  } catch {
    // ignore
  }

  try {
    await pool.query(
      `CREATE INDEX idx_student_invoices_school ON student_invoices(school_name)`
    );
  } catch {
    // ignore
  }

  try {
    await pool.query(
      `CREATE INDEX idx_student_invoice_lines_invoice ON student_invoice_lines(invoice_id)`
    );
  } catch {
    // ignore
  }

  const formalCols = [
    `ALTER TABLE student_invoices ADD COLUMN billed_to_attn VARCHAR(200) NULL AFTER notes`,
    `ALTER TABLE student_invoices ADD COLUMN subject VARCHAR(255) NULL AFTER billed_to_attn`,
    `ALTER TABLE student_invoices ADD COLUMN tax_rate DECIMAL(5,2) NOT NULL DEFAULT 0.00 AFTER subject`,
    `ALTER TABLE student_invoices ADD COLUMN bank_account_id VARCHAR(64) NULL AFTER tax_rate`,
    `ALTER TABLE student_invoices ADD COLUMN bank_name VARCHAR(150) NULL AFTER bank_account_id`,
    `ALTER TABLE student_invoices ADD COLUMN branch_code VARCHAR(50) NULL AFTER bank_name`,
    `ALTER TABLE student_invoices ADD COLUMN branch_name VARCHAR(150) NULL AFTER branch_code`,
    `ALTER TABLE student_invoices ADD COLUMN account_number VARCHAR(50) NULL AFTER branch_name`,
    `ALTER TABLE student_invoices ADD COLUMN account_holder VARCHAR(150) NULL AFTER account_number`,
  ];
  for (const sql of formalCols) {
    try {
      await pool.query(sql);
    } catch (err: any) {
      if (err?.code !== 'ER_DUP_FIELDNAME' && err?.errno !== 1060) {
        // ignore
      }
    }
  }

  schemaEnsured = true;
}

function mapLine(row: LineRow): StudentInvoiceLine {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    studentId: row.student_id,
    studentName: row.student_name || '',
    serialNo: row.serial_no || '',
    passportNo: row.passport_no || '',
    amount: num(row.amount),
  };
}

function mapStudentInvoice(row: StudentInvoiceRow, lines: StudentInvoiceLine[] = []): StudentInvoice {
  const schoolName =
    row.school_name || row.legacy_supervising_org || lines[0]?.studentName || '';
  const totalAmount = num(row.total_amount);
  const taxRate = normalizeTaxRate(row.tax_rate, 0);
  const taxAmount = calcTaxAmount(totalAmount, taxRate);
  const amountDue = calcAmountDue(totalAmount, taxRate);
  return {
    id: row.id,
    invoiceNo: row.invoice_no,
    schoolName,
    studentId: row.student_id || undefined,
    studentName: schoolName,
    passportNo: row.legacy_passport_no || '',
    hostCompany: row.legacy_host_company || '',
    supervisingOrg: schoolName,
    feeType: 'introduction',
    billingPeriod: row.billing_period,
    lastInvoiceDate: toDateStr(row.last_invoice_date),
    nextInvoiceDate: toDateStr(row.next_invoice_date),
    totalAmount,
    taxAmount,
    amountDue,
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
    billedToAttn: row.billed_to_attn || '',
    subject: row.subject || '',
    taxRate,
    bankAccountId: row.bank_account_id || undefined,
    bankName: row.bank_name || '',
    branchCode: row.branch_code || '',
    branchName: row.branch_name || '',
    accountNumber: row.account_number || '',
    accountHolder: row.account_holder || '',
    createdAt: toIso(row.created_at),
    lines,
    studentCount: lines.length,
  };
}

const STUDENT_INVOICE_SELECT = `
  SELECT i.*,
    s.name AS legacy_student_name,
    s.passport_no AS legacy_passport_no,
    d.host_company AS legacy_host_company,
    d.supervising_org AS legacy_supervising_org
  FROM student_invoices i
  LEFT JOIN students s ON s.id = i.student_id
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

async function loadLines(invoiceIds: string[]): Promise<Map<string, StudentInvoiceLine[]>> {
  const map = new Map<string, StudentInvoiceLine[]>();
  if (invoiceIds.length === 0) return map;

  const placeholders = invoiceIds.map((_, i) => `:id${i}`).join(', ');
  const params: Record<string, string> = {};
  invoiceIds.forEach((id, i) => {
    params[`id${i}`] = id;
  });

  const [rows] = await pool.query<LineRow[]>(
    `SELECT l.id, l.invoice_id, l.student_id, l.amount,
            s.name AS student_name, s.serial_no, s.passport_no
     FROM student_invoice_lines l
     JOIN students s ON s.id = l.student_id
     WHERE l.invoice_id IN (${placeholders})
     ORDER BY s.name ASC`,
    params
  );

  for (const row of rows) {
    const list = map.get(row.invoice_id) || [];
    list.push(mapLine(row));
    map.set(row.invoice_id, list);
  }
  return map;
}

export async function listStudentsForSchool(schoolName: string): Promise<
  {
    studentId: string;
    studentName: string;
    serialNo: string;
    passportNo: string;
    introductionFee: number;
    hostCompany: string;
  }[]
> {
  await ensureSchoolInvoiceSchema();
  const name = schoolName.trim();
  if (!name) return [];

  const [rows] = await pool.query<SchoolStudentRow[]>(
    `SELECT s.id, s.name, s.serial_no, s.passport_no,
            COALESCE(f.introduction_fee, 0) AS introduction_fee,
            d.host_company
     FROM students s
     JOIN student_deployments d ON d.student_id = s.id
     LEFT JOIN student_financial_configs f ON f.student_id = s.id
     WHERE d.supervising_org = :schoolName
     ORDER BY s.name ASC`,
    { schoolName: name }
  );

  return rows.map((row) => ({
    studentId: row.id,
    studentName: row.name,
    serialNo: row.serial_no,
    passportNo: row.passport_no,
    introductionFee: num(row.introduction_fee),
    hostCompany: row.host_company || '',
  }));
}

export async function listStudentInvoices(filters: {
  status?: string;
  studentId?: string;
  schoolName?: string;
  feeType?: string;
  upcoming7Days?: string;
}): Promise<StudentInvoice[]> {
  await ensureStudentInvoicePaymentsTable();
  await ensureSchoolInvoiceSchema();

  const where: string[] = [];
  const params: Record<string, string> = {};

  if (filters.status) {
    where.push('i.status = :status');
    params.status = filters.status;
  }
  if (filters.schoolName) {
    where.push('i.school_name = :schoolName');
    params.schoolName = filters.schoolName;
  }
  if (filters.studentId) {
    where.push(`(
      i.student_id = :studentId
      OR EXISTS (
        SELECT 1 FROM student_invoice_lines l
        WHERE l.invoice_id = i.id AND l.student_id = :studentId
      )
    )`);
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
  const lineMap = await loadLines(rows.map((r) => r.id));
  return rows.map((row) => mapStudentInvoice(row, lineMap.get(row.id) || []));
}

export async function getStudentInvoiceById(id: string): Promise<StudentInvoice> {
  await ensureStudentInvoicePaymentsTable();
  await ensureSchoolInvoiceSchema();
  const [rows] = await pool.query<StudentInvoiceRow[]>(
    `${STUDENT_INVOICE_SELECT} WHERE i.id = :id LIMIT 1`,
    { id }
  );
  if (!rows[0]) throw new AppError('Invoice not found', 404);
  const lineMap = await loadLines([id]);
  return mapStudentInvoice(rows[0], lineMap.get(id) || []);
}

export async function createStudentInvoice(
  body: Partial<StudentInvoice> & { schoolName?: string }
): Promise<StudentInvoice> {
  await ensureSchoolInvoiceSchema();

  const schoolName = (body.schoolName || body.supervisingOrg || '').trim();
  if (!schoolName) throw new AppError('School Name ရွေးချယ်ပါ။', 400);

  const schoolStudents = await listStudentsForSchool(schoolName);
  if (schoolStudents.length === 0) {
    throw new AppError('ဤ School Name အောက်တွင် ကျောင်းသား မရှိပါ။', 400);
  }

  const computedTotal = schoolStudents.reduce((sum, s) => sum + s.introductionFee, 0);
  const lastInvoiceDate = body.lastInvoiceDate || new Date().toISOString().split('T')[0];
  const nextInvoiceDate = body.nextInvoiceDate || lastInvoiceDate;
  const totalAmount =
    body.totalAmount !== undefined ? num(body.totalAmount) : computedTotal;
  const formal = await resolveFormalInvoiceFields({
    billedToAttn: body.billedToAttn,
    subject: body.subject,
    taxRate: body.taxRate,
    bankAccountId: body.bankAccountId,
    requireComplete: true,
  });
  const amountDue = calcAmountDue(totalAmount, formal.taxRate);
  const amountReceived = 0;
  const outstandingAmount = Math.max(0, amountDue - amountReceived);
  const status = resolveStatus(amountDue, amountReceived, outstandingAmount, body.status);

  const [countRows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS c FROM student_invoices WHERE invoice_no LIKE :prefix',
    { prefix: `SINV-${new Date().getFullYear()}-%` }
  );
  const invoiceNo =
    body.invoiceNo ||
    `SINV-${new Date().getFullYear()}-${String(Number(countRows[0].c) + 1).padStart(3, '0')}`;

  const id = newId('sinv');
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.execute(
      `INSERT INTO student_invoices
        (id, invoice_no, student_id, school_name, fee_type, billing_period, last_invoice_date, next_invoice_date,
         total_amount, amount_received, outstanding_amount, payment_received_date,
         receipt_no, receipt_sent_date, status, currency, notes,
         billed_to_attn, subject, tax_rate, bank_account_id, bank_name, branch_code, branch_name,
         account_number, account_holder)
       VALUES
        (:id, :invoiceNo, NULL, :schoolName, 'introduction', :billingPeriod, :lastInvoiceDate, :nextInvoiceDate,
         :totalAmount, :amountReceived, :outstandingAmount, :paymentReceivedDate,
         :receiptNo, :receiptSentDate, :status, :currency, :notes,
         :billedToAttn, :subject, :taxRate, :bankAccountId, :bankName, :branchCode, :branchName,
         :accountNumber, :accountHolder)`,
      {
        id,
        invoiceNo,
        schoolName,
        billingPeriod: body.billingPeriod || `Introduction Fee — ${schoolName}`,
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
        billedToAttn: formal.billedToAttn,
        subject: formal.subject,
        taxRate: formal.taxRate,
        bankAccountId: formal.bankAccountId || null,
        bankName: formal.bankName || null,
        branchCode: formal.branchCode || null,
        branchName: formal.branchName || null,
        accountNumber: formal.accountNumber || null,
        accountHolder: formal.accountHolder || null,
      }
    );

    for (const student of schoolStudents) {
      await conn.execute(
        `INSERT INTO student_invoice_lines (id, invoice_id, student_id, amount)
         VALUES (:id, :invoiceId, :studentId, :amount)`,
        {
          id: newId('sil'),
          invoiceId: id,
          studentId: student.studentId,
          amount: student.introductionFee,
        }
      );
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return getStudentInvoiceById(id);
}

export async function updateStudentInvoice(
  id: string,
  body: Partial<StudentInvoice>
): Promise<StudentInvoice> {
  await ensureSchoolInvoiceSchema();
  const existing = await getStudentInvoiceById(id);
  const totalAmount =
    body.totalAmount !== undefined ? num(body.totalAmount) : existing.totalAmount;
  const formal = await resolveFormalInvoiceFields({
    billedToAttn: body.billedToAttn,
    subject: body.subject,
    taxRate: body.taxRate,
    bankAccountId: body.bankAccountId,
    requireComplete: true,
    existing: {
      billedToAttn: existing.billedToAttn,
      subject: existing.subject,
      taxRate: existing.taxRate,
      bankAccountId: existing.bankAccountId,
      bankName: existing.bankName,
      branchCode: existing.branchCode,
      branchName: existing.branchName,
      accountNumber: existing.accountNumber,
      accountHolder: existing.accountHolder,
    },
  });
  const { recomputeStudentInvoiceTotals } = await import('./studentInvoicePaymentService.js');

  await pool.execute(
    `UPDATE student_invoices SET
      invoice_no = :invoiceNo, fee_type = 'introduction', billing_period = :billingPeriod,
      last_invoice_date = :lastInvoiceDate, next_invoice_date = :nextInvoiceDate,
      total_amount = :totalAmount,
      receipt_sent_date = :receiptSentDate,
      currency = :currency, notes = :notes,
      school_name = :schoolName,
      billed_to_attn = :billedToAttn,
      subject = :subject,
      tax_rate = :taxRate,
      bank_account_id = :bankAccountId,
      bank_name = :bankName,
      branch_code = :branchCode,
      branch_name = :branchName,
      account_number = :accountNumber,
      account_holder = :accountHolder
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
      schoolName: existing.schoolName || body.schoolName || body.supervisingOrg || '',
      billedToAttn: formal.billedToAttn,
      subject: formal.subject,
      taxRate: formal.taxRate,
      bankAccountId: formal.bankAccountId || null,
      bankName: formal.bankName || null,
      branchCode: formal.branchCode || null,
      branchName: formal.branchName || null,
      accountNumber: formal.accountNumber || null,
      accountHolder: formal.accountHolder || null,
    }
  );

  await recomputeStudentInvoiceTotals(id);
  return getStudentInvoiceById(id);
}

export async function deleteStudentInvoice(id: string): Promise<void> {
  await ensureSchoolInvoiceSchema();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('DELETE FROM student_invoice_lines WHERE invoice_id = :id', { id });
    await conn.execute('DELETE FROM student_invoice_payments WHERE invoice_id = :id', { id });
    const [result] = await conn.execute<ResultSetHeader>(
      'DELETE FROM student_invoices WHERE id = :id',
      { id }
    );
    if (result.affectedRows === 0) throw new AppError('Invoice not found', 404);
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}
