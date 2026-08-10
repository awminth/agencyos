import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import type { Invoice, InvoiceFeeType, InvoiceLine, InvoiceStatus } from '../types/index.js';
import { newId, num, toDateStr, toIso } from '../utils/helpers.js';
import { ensureInvoicePaymentsTable } from './invoicePaymentService.js';

interface InvoiceRow extends RowDataPacket {
  id: string;
  invoice_no: string;
  worker_id: string | null;
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
  invoice_host_company: string | null;
  invoice_supervising_org: string | null;
  legacy_worker_name: string | null;
  legacy_passport_no: string | null;
  legacy_host_company: string | null;
  legacy_supervising_org: string | null;
}

interface LineRow extends RowDataPacket {
  id: string;
  invoice_id: string;
  worker_id: string;
  amount: number;
  worker_name: string;
  serial_no: string | null;
  passport_no: string | null;
}

interface HostWorkerRow extends RowDataPacket {
  id: string;
  name: string;
  serial_no: string;
  passport_no: string;
  flight_fee: number;
  training_fee: number;
  management_fee: number;
  billing_cycle_months: number;
  currency: 'JPY' | 'MMK' | 'USD' | null;
  supervising_org: string | null;
}

let schemaEnsured = false;

export async function ensureHostInvoiceSchema(): Promise<void> {
  if (schemaEnsured) return;

  await pool.query(`
    CREATE TABLE IF NOT EXISTS invoice_lines (
      id VARCHAR(64) PRIMARY KEY,
      invoice_id VARCHAR(64) NOT NULL,
      worker_id VARCHAR(64) NOT NULL,
      amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      UNIQUE KEY uq_invoice_line (invoice_id, worker_id),
      KEY idx_invoice_lines_invoice (invoice_id),
      KEY idx_invoice_lines_worker (worker_id)
    )
  `);

  try {
    await pool.query(
      `ALTER TABLE invoices ADD COLUMN host_company VARCHAR(150) NULL AFTER worker_id`
    );
  } catch (err: any) {
    if (err?.code !== 'ER_DUP_FIELDNAME' && err?.errno !== 1060) {
      // ignore
    }
  }

  try {
    await pool.query(
      `ALTER TABLE invoices ADD COLUMN supervising_org VARCHAR(150) NULL AFTER host_company`
    );
  } catch (err: any) {
    if (err?.code !== 'ER_DUP_FIELDNAME' && err?.errno !== 1060) {
      // ignore
    }
  }

  try {
    await pool.query(`ALTER TABLE invoices MODIFY worker_id VARCHAR(64) NULL`);
  } catch {
    // ignore
  }

  try {
    await pool.query(`
      UPDATE invoices i
      LEFT JOIN deployments d ON d.worker_id = i.worker_id
      SET
        i.host_company = COALESCE(NULLIF(i.host_company, ''), d.host_company),
        i.supervising_org = COALESCE(NULLIF(i.supervising_org, ''), d.supervising_org)
      WHERE i.host_company IS NULL OR i.host_company = ''
         OR i.supervising_org IS NULL OR i.supervising_org = ''
    `);
  } catch {
    // ignore
  }

  try {
    await pool.query(`
      INSERT IGNORE INTO invoice_lines (id, invoice_id, worker_id, amount)
      SELECT CONCAT('il-', i.id), i.id, i.worker_id, i.total_amount
      FROM invoices i
      WHERE i.worker_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM invoice_lines l WHERE l.invoice_id = i.id)
    `);
  } catch {
    // ignore
  }

  try {
    await pool.query(`CREATE INDEX idx_invoices_host ON invoices(host_company)`);
  } catch {
    // ignore
  }

  schemaEnsured = true;
}

function normalizeFeeType(value: unknown): InvoiceFeeType {
  if (value === 'flight' || value === 'training' || value === 'management') return value;
  return 'management';
}

function feeAmountFromRow(row: HostWorkerRow, feeType: InvoiceFeeType): number {
  const cycle = Number(row.billing_cycle_months) || 6;
  if (feeType === 'flight') return num(row.flight_fee);
  if (feeType === 'training') return num(row.training_fee);
  return num(row.management_fee) * cycle;
}

function defaultBillingPeriod(feeType: InvoiceFeeType, hostCompany: string): string {
  const year = new Date().getFullYear();
  if (feeType === 'flight') return `Flight Fee — ${hostCompany}`;
  if (feeType === 'training') return `Training Fee — ${hostCompany}`;
  return `${year} Cycle — ${hostCompany}`;
}

function mapLine(row: LineRow): InvoiceLine {
  return {
    id: row.id,
    invoiceId: row.invoice_id,
    workerId: row.worker_id,
    workerName: row.worker_name || '',
    serialNo: row.serial_no || '',
    passportNo: row.passport_no || '',
    amount: num(row.amount),
  };
}

function mapInvoice(row: InvoiceRow, lines: InvoiceLine[] = []): Invoice {
  const hostCompany =
    row.invoice_host_company || row.legacy_host_company || '';
  const supervisingOrg =
    row.invoice_supervising_org || row.legacy_supervising_org || '';
  return {
    id: row.id,
    invoiceNo: row.invoice_no,
    workerId: row.worker_id || undefined,
    workerName: hostCompany || row.legacy_worker_name || '',
    passportNo: row.legacy_passport_no || '',
    hostCompany,
    supervisingOrg,
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
    lines,
    workerCount: lines.length,
  };
}

const INVOICE_SELECT = `
  SELECT i.*,
    i.host_company AS invoice_host_company,
    i.supervising_org AS invoice_supervising_org,
    w.name AS legacy_worker_name,
    w.passport_no AS legacy_passport_no,
    d.host_company AS legacy_host_company,
    d.supervising_org AS legacy_supervising_org
  FROM invoices i
  LEFT JOIN workers w ON w.id = i.worker_id
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

async function loadLines(invoiceIds: string[]): Promise<Map<string, InvoiceLine[]>> {
  const map = new Map<string, InvoiceLine[]>();
  if (invoiceIds.length === 0) return map;

  const placeholders = invoiceIds.map((_, i) => `:id${i}`).join(', ');
  const params: Record<string, string> = {};
  invoiceIds.forEach((id, i) => {
    params[`id${i}`] = id;
  });

  const [rows] = await pool.query<LineRow[]>(
    `SELECT l.id, l.invoice_id, l.worker_id, l.amount,
            w.name AS worker_name, w.serial_no, w.passport_no
     FROM invoice_lines l
     JOIN workers w ON w.id = l.worker_id
     WHERE l.invoice_id IN (${placeholders})
     ORDER BY w.name ASC`,
    params
  );

  for (const row of rows) {
    const list = map.get(row.invoice_id) || [];
    list.push(mapLine(row));
    map.set(row.invoice_id, list);
  }
  return map;
}

export async function listWorkersForHost(
  hostCompany: string,
  supervisingOrg?: string
): Promise<
  {
    workerId: string;
    workerName: string;
    serialNo: string;
    passportNo: string;
    supervisingOrg: string;
    hostCompany: string;
    currency: 'JPY' | 'MMK' | 'USD';
    amounts: { management: number; flight: number; training: number };
  }[]
> {
  await ensureHostInvoiceSchema();
  const host = hostCompany.trim();
  if (!host) return [];

  const where = ['d.host_company = :hostCompany'];
  const params: Record<string, string> = { hostCompany: host };
  if (supervisingOrg?.trim()) {
    where.push('d.supervising_org = :supervisingOrg');
    params.supervisingOrg = supervisingOrg.trim();
  }

  const [rows] = await pool.query<HostWorkerRow[]>(
    `SELECT w.id, w.name, w.serial_no, w.passport_no,
            COALESCE(f.flight_fee, 0) AS flight_fee,
            COALESCE(f.training_fee, 0) AS training_fee,
            COALESCE(f.management_fee, 0) AS management_fee,
            COALESCE(f.billing_cycle_months, 6) AS billing_cycle_months,
            f.currency,
            d.supervising_org
     FROM workers w
     JOIN deployments d ON d.worker_id = w.id
     LEFT JOIN financial_configs f ON f.worker_id = w.id
     WHERE ${where.join(' AND ')}
     ORDER BY w.name ASC`,
    params
  );

  return rows.map((row) => ({
    workerId: row.id,
    workerName: row.name,
    serialNo: row.serial_no,
    passportNo: row.passport_no,
    supervisingOrg: row.supervising_org || '',
    hostCompany: host,
    currency: row.currency || 'JPY',
    amounts: {
      management: feeAmountFromRow(row, 'management'),
      flight: feeAmountFromRow(row, 'flight'),
      training: feeAmountFromRow(row, 'training'),
    },
  }));
}

export async function listInvoices(filters: {
  status?: string;
  workerId?: string;
  hostCompany?: string;
  supervisingOrg?: string;
  feeType?: string;
  upcoming7Days?: string;
}): Promise<Invoice[]> {
  await ensureInvoicePaymentsTable();
  await ensureHostInvoiceSchema();

  const where: string[] = [];
  const params: Record<string, string> = {};

  if (filters.status) {
    where.push('i.status = :status');
    params.status = filters.status;
  }
  if (filters.hostCompany) {
    where.push('i.host_company = :hostCompany');
    params.hostCompany = filters.hostCompany;
  }
  if (filters.supervisingOrg) {
    where.push('i.supervising_org = :supervisingOrg');
    params.supervisingOrg = filters.supervisingOrg;
  }
  if (filters.workerId) {
    where.push(`(
      i.worker_id = :workerId
      OR EXISTS (
        SELECT 1 FROM invoice_lines l
        WHERE l.invoice_id = i.id AND l.worker_id = :workerId
      )
    )`);
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
  const lineMap = await loadLines(rows.map((r) => r.id));
  return rows.map((row) => mapInvoice(row, lineMap.get(row.id) || []));
}

export async function getInvoiceById(id: string): Promise<Invoice> {
  await ensureInvoicePaymentsTable();
  await ensureHostInvoiceSchema();
  const [rows] = await pool.query<InvoiceRow[]>(
    `${INVOICE_SELECT} WHERE i.id = :id LIMIT 1`,
    { id }
  );
  if (!rows[0]) throw new AppError('Invoice not found', 404);
  const lineMap = await loadLines([id]);
  return mapInvoice(rows[0], lineMap.get(id) || []);
}

export async function createInvoice(body: Partial<Invoice>): Promise<Invoice> {
  await ensureHostInvoiceSchema();

  const hostCompany = (body.hostCompany || '').trim();
  const supervisingOrg = (body.supervisingOrg || '').trim();
  if (!hostCompany) throw new AppError('Host Company ရွေးချယ်ပါ။', 400);
  if (!supervisingOrg) throw new AppError('Supervising Org ရွေးချယ်ပါ။', 400);

  const feeType = normalizeFeeType(body.feeType);
  const hostWorkers = await listWorkersForHost(hostCompany, supervisingOrg);
  if (hostWorkers.length === 0) {
    throw new AppError('ဤ Host Company အောက်တွင် Worker မရှိပါ။', 400);
  }

  const computedTotal = hostWorkers.reduce(
    (sum, w) => sum + w.amounts[feeType],
    0
  );
  const lastInvoiceDate = body.lastInvoiceDate || new Date().toISOString().split('T')[0];

  let nextInvoiceDate = body.nextInvoiceDate;
  if (!nextInvoiceDate) {
    if (feeType === 'management') {
      const d = new Date(lastInvoiceDate);
      d.setMonth(d.getMonth() + 6);
      nextInvoiceDate = d.toISOString().split('T')[0];
    } else {
      nextInvoiceDate = lastInvoiceDate;
    }
  }

  const totalAmount =
    body.totalAmount !== undefined ? num(body.totalAmount) : computedTotal;
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
  const currency = body.currency || hostWorkers[0]?.currency || 'JPY';

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.execute(
      `INSERT INTO invoices
        (id, invoice_no, worker_id, host_company, supervising_org, fee_type, billing_period,
         last_invoice_date, next_invoice_date, total_amount, amount_received, outstanding_amount,
         payment_received_date, receipt_no, receipt_sent_date, status, currency, notes)
       VALUES
        (:id, :invoiceNo, NULL, :hostCompany, :supervisingOrg, :feeType, :billingPeriod,
         :lastInvoiceDate, :nextInvoiceDate, :totalAmount, :amountReceived, :outstandingAmount,
         :paymentReceivedDate, :receiptNo, :receiptSentDate, :status, :currency, :notes)`,
      {
        id,
        invoiceNo,
        hostCompany,
        supervisingOrg,
        feeType,
        billingPeriod: body.billingPeriod || defaultBillingPeriod(feeType, hostCompany),
        lastInvoiceDate,
        nextInvoiceDate,
        totalAmount,
        amountReceived,
        outstandingAmount,
        paymentReceivedDate: null,
        receiptNo: null,
        receiptSentDate: body.receiptSentDate || null,
        status,
        currency,
        notes: body.notes || '',
      }
    );

    for (const worker of hostWorkers) {
      await conn.execute(
        `INSERT INTO invoice_lines (id, invoice_id, worker_id, amount)
         VALUES (:id, :invoiceId, :workerId, :amount)`,
        {
          id: newId('il'),
          invoiceId: id,
          workerId: worker.workerId,
          amount: worker.amounts[feeType],
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

  return getInvoiceById(id);
}

export async function updateInvoice(id: string, body: Partial<Invoice>): Promise<Invoice> {
  await ensureHostInvoiceSchema();
  const existing = await getInvoiceById(id);
  const feeType =
    body.feeType !== undefined ? normalizeFeeType(body.feeType) : existing.feeType;
  const totalAmount =
    body.totalAmount !== undefined ? num(body.totalAmount) : existing.totalAmount;
  const { recomputeInvoiceTotals } = await import('./invoicePaymentService.js');

  await pool.execute(
    `UPDATE invoices SET
      invoice_no = :invoiceNo, fee_type = :feeType, billing_period = :billingPeriod,
      last_invoice_date = :lastInvoiceDate, next_invoice_date = :nextInvoiceDate,
      total_amount = :totalAmount,
      receipt_sent_date = :receiptSentDate,
      currency = :currency, notes = :notes,
      host_company = :hostCompany,
      supervising_org = :supervisingOrg
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
      hostCompany: existing.hostCompany || body.hostCompany || '',
      supervisingOrg: existing.supervisingOrg || body.supervisingOrg || '',
    }
  );

  await recomputeInvoiceTotals(id);
  return getInvoiceById(id);
}

export async function deleteInvoice(id: string): Promise<void> {
  await ensureHostInvoiceSchema();
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute('DELETE FROM invoice_lines WHERE invoice_id = :id', { id });
    await conn.execute('DELETE FROM invoice_payments WHERE invoice_id = :id', { id });
    const [result] = await conn.execute<ResultSetHeader>(
      'DELETE FROM invoices WHERE id = :id',
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
