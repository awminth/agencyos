import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import type { Worker, WorkerStatus } from '../types/index.js';
import { newId, num, toDateStr, toIso } from '../utils/helpers.js';

interface WorkerRow extends RowDataPacket {
  id: string;
  serial_no: string;
  name: string;
  gender: 'Male' | 'Female';
  dob: string;
  passport_no: string;
  status: WorkerStatus;
  absconded_date: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
  visa_type: string | null;
  supervising_org: string | null;
  host_company: string | null;
  job_category: string | null;
  own_card_date: string | null;
  departure_date: string | null;
  japan_entry_date: string | null;
  contract_end_date: string | null;
  flight_fee: number | null;
  training_fee: number | null;
  management_fee: number | null;
  billing_cycle_months: number | null;
  currency: 'JPY' | 'MMK' | 'USD' | null;
}

function mapWorker(row: WorkerRow): Worker {
  return {
    id: row.id,
    serialNo: row.serial_no,
    name: row.name,
    gender: row.gender,
    dob: toDateStr(row.dob),
    passportNo: row.passport_no,
    status: row.status,
    abscondedDate: row.absconded_date ? toDateStr(row.absconded_date) : undefined,
    notes: row.notes || '',
    deployment: {
      visaType: row.visa_type || 'TITP-1',
      supervisingOrg: row.supervising_org || '',
      hostCompany: row.host_company || '',
      jobCategory: row.job_category || '',
      ownCardDate: toDateStr(row.own_card_date),
      departureDate: toDateStr(row.departure_date),
      japanEntryDate: toDateStr(row.japan_entry_date),
      contractEndDate: toDateStr(row.contract_end_date),
    },
    financialConfig: {
      flightFee: num(row.flight_fee),
      trainingFee: num(row.training_fee),
      managementFee: num(row.management_fee, 30000),
      billingCycleMonths: num(row.billing_cycle_months, 6),
      currency: (row.currency as 'JPY' | 'MMK' | 'USD') || 'JPY',
    },
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

const WORKER_SELECT = `
  SELECT w.*,
    d.visa_type, d.supervising_org, d.host_company, d.job_category,
    d.own_card_date, d.departure_date, d.japan_entry_date, d.contract_end_date,
    f.flight_fee, f.training_fee, f.management_fee, f.billing_cycle_months, f.currency
  FROM workers w
  LEFT JOIN deployments d ON d.worker_id = w.id
  LEFT JOIN financial_configs f ON f.worker_id = w.id
`;

export async function listWorkers(filters: {
  status?: string;
  visaType?: string;
  search?: string;
  expiringDays?: string;
}): Promise<Worker[]> {
  const where: string[] = [];
  const params: Record<string, string | number> = {};

  if (filters.status) {
    where.push('w.status = :status');
    params.status = filters.status;
  }
  if (filters.visaType) {
    where.push('d.visa_type = :visaType');
    params.visaType = filters.visaType;
  }
  if (filters.search) {
    where.push(`(
      LOWER(w.name) LIKE :q OR LOWER(w.serial_no) LIKE :q OR LOWER(w.passport_no) LIKE :q
      OR LOWER(d.host_company) LIKE :q OR LOWER(d.supervising_org) LIKE :q
    )`);
    params.q = `%${filters.search.toLowerCase().trim()}%`;
  }
  if (filters.expiringDays) {
    const days = parseInt(filters.expiringDays, 10);
    where.push(`w.status = 'Active'`);
    where.push(`d.contract_end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL :expDays DAY)`);
    params.expDays = days;
  }

  const sql = `${WORKER_SELECT}${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY w.created_at DESC`;
  const [rows] = await pool.query<WorkerRow[]>(sql, params);
  return rows.map(mapWorker);
}

export async function getWorkerById(id: string): Promise<Worker | null> {
  const [rows] = await pool.query<WorkerRow[]>(`${WORKER_SELECT} WHERE w.id = :id LIMIT 1`, { id });
  return rows[0] ? mapWorker(rows[0]) : null;
}

export async function createWorker(body: Partial<Worker>): Promise<Worker> {
  if (!body.name?.trim()) {
    throw new AppError('အလုပ်သမား အမည် ထည့်သွင်းပါ။', 400);
  }
  if (!body.passportNo?.trim()) {
    throw new AppError('Passport နံပါတ် ထည့်သွင်းပါ။', 400);
  }
  const dep = body.deployment;
  if (!dep?.visaType || !dep?.supervisingOrg || !dep?.hostCompany || !dep?.jobCategory) {
    throw new AppError(
      'Visa / ကြီးကြပ်ရေး / Host Company / အလုပ်အမျိုးအစား ကို ရွေးချယ်ပါ။',
      400
    );
  }

  const id = newId('w');
  const depId = newId('dep');
  const finId = newId('fin');
  const year = new Date().getFullYear();

  const [countRows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS c FROM workers WHERE serial_no LIKE :prefix',
    { prefix: `W-${year}-%` }
  );
  const serialNo =
    body.serialNo || `W-${year}-${String(Number(countRows[0].c) + 1).padStart(3, '0')}`;

  const status = (body.status || 'Active') as WorkerStatus;
  const abscondedDate =
    status === 'Absconded'
      ? body.abscondedDate || new Date().toISOString().split('T')[0]
      : null;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.execute<ResultSetHeader>(
      `INSERT INTO workers
        (id, serial_no, name, gender, dob, passport_no, status, absconded_date, notes)
       VALUES (:id, :serialNo, :name, :gender, :dob, :passportNo, :status, :abscondedDate, :notes)`,
      {
        id,
        serialNo,
        name: body.name || 'Unnamed Worker',
        gender: body.gender || 'Male',
        dob: body.dob || '2000-01-01',
        passportNo: body.passportNo || '',
        status,
        abscondedDate,
        notes: body.notes || '',
      }
    );

    const dep = body.deployment!;
    await conn.execute(
      `INSERT INTO deployments
        (id, worker_id, visa_type, supervising_org, host_company, job_category,
         own_card_date, departure_date, japan_entry_date, contract_end_date)
       VALUES (:id, :workerId, :visaType, :supervisingOrg, :hostCompany, :jobCategory,
         NULLIF(:ownCardDate, ''), NULLIF(:departureDate, ''), NULLIF(:japanEntryDate, ''), NULLIF(:contractEndDate, ''))`,
      {
        id: depId,
        workerId: id,
        visaType: dep.visaType || 'TITP-1',
        supervisingOrg: dep.supervisingOrg || '',
        hostCompany: dep.hostCompany || '',
        jobCategory: dep.jobCategory || '',
        ownCardDate: dep.ownCardDate || '',
        departureDate: dep.departureDate || '',
        japanEntryDate: dep.japanEntryDate || '',
        contractEndDate: dep.contractEndDate || '',
      }
    );

    const fin = body.financialConfig || ({} as Worker['financialConfig']);
    await conn.execute(
      `INSERT INTO financial_configs
        (id, worker_id, flight_fee, training_fee, management_fee, billing_cycle_months, currency)
       VALUES (:id, :workerId, :flightFee, :trainingFee, :managementFee, :billingCycleMonths, :currency)`,
      {
        id: finId,
        workerId: id,
        flightFee: num(fin.flightFee),
        trainingFee: num(fin.trainingFee),
        managementFee: num(fin.managementFee, 30000),
        billingCycleMonths: num(fin.billingCycleMonths, 6),
        currency: fin.currency || 'JPY',
      }
    );

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  const created = await getWorkerById(id);
  if (!created) throw new AppError('Failed to create worker', 500);
  return created;
}

export async function updateWorker(id: string, body: Partial<Worker>): Promise<Worker> {
  const existing = await getWorkerById(id);
  if (!existing) throw new AppError('Worker not found', 404);

  const status = (body.status ?? existing.status) as WorkerStatus;
  const abscondedDate =
    status === 'Absconded'
      ? body.abscondedDate || existing.abscondedDate || new Date().toISOString().split('T')[0]
      : null;

  const deployment = { ...existing.deployment, ...(body.deployment || {}) };
  const financial = { ...existing.financialConfig, ...(body.financialConfig || {}) };

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.execute(
      `UPDATE workers SET
        name = :name, gender = :gender, dob = :dob, passport_no = :passportNo,
        status = :status, absconded_date = :abscondedDate, notes = :notes
       WHERE id = :id`,
      {
        id,
        name: body.name ?? existing.name,
        gender: body.gender ?? existing.gender,
        dob: body.dob ?? existing.dob,
        passportNo: body.passportNo ?? existing.passportNo,
        status,
        abscondedDate,
        notes: body.notes ?? existing.notes ?? '',
      }
    );

    await conn.execute(
      `UPDATE deployments SET
        visa_type = :visaType, supervising_org = :supervisingOrg, host_company = :hostCompany,
        job_category = :jobCategory, own_card_date = NULLIF(:ownCardDate, ''),
        departure_date = NULLIF(:departureDate, ''), japan_entry_date = NULLIF(:japanEntryDate, ''),
        contract_end_date = NULLIF(:contractEndDate, '')
       WHERE worker_id = :id`,
      {
        id,
        visaType: deployment.visaType,
        supervisingOrg: deployment.supervisingOrg,
        hostCompany: deployment.hostCompany,
        jobCategory: deployment.jobCategory,
        ownCardDate: deployment.ownCardDate || '',
        departureDate: deployment.departureDate || '',
        japanEntryDate: deployment.japanEntryDate || '',
        contractEndDate: deployment.contractEndDate || '',
      }
    );

    await conn.execute(
      `UPDATE financial_configs SET
        flight_fee = :flightFee, training_fee = :trainingFee,
        management_fee = :managementFee, billing_cycle_months = :billingCycleMonths,
        currency = :currency
       WHERE worker_id = :id`,
      {
        id,
        flightFee: num(financial.flightFee),
        trainingFee: num(financial.trainingFee),
        managementFee: num(financial.managementFee, 30000),
        billingCycleMonths: num(financial.billingCycleMonths, 6),
        currency: financial.currency || 'JPY',
      }
    );

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  const updated = await getWorkerById(id);
  if (!updated) throw new AppError('Worker not found after update', 404);
  return updated;
}

export async function getWorkerRelated(id: string): Promise<{
  workerId: string;
  workerName: string;
  serialNo: string;
  invoiceCount: number;
  invoices: { id: string; invoiceNo: string; status: string; outstandingAmount: number }[];
  hasRelated: boolean;
}> {
  const worker = await getWorkerById(id);
  if (!worker) throw new AppError('Worker not found', 404);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, invoice_no, status, outstanding_amount
     FROM invoices
     WHERE worker_id = :id
     ORDER BY created_at DESC`,
    { id }
  );

  const invoices = rows.map((r) => ({
    id: String(r.id),
    invoiceNo: String(r.invoice_no),
    status: String(r.status),
    outstandingAmount: num(r.outstanding_amount),
  }));

  return {
    workerId: worker.id,
    workerName: worker.name,
    serialNo: worker.serialNo,
    invoiceCount: invoices.length,
    invoices,
    hasRelated: invoices.length > 0,
  };
}

/** Hard delete worker + related invoices (reports source data). */
export async function deleteWorker(id: string): Promise<{ deletedInvoices: number }> {
  const existing = await getWorkerById(id);
  if (!existing) throw new AppError('Worker not found', 404);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [invResult] = await conn.execute<ResultSetHeader>(
      'DELETE FROM invoices WHERE worker_id = :id',
      { id }
    );
    await conn.execute('DELETE FROM deployments WHERE worker_id = :id', { id });
    await conn.execute('DELETE FROM financial_configs WHERE worker_id = :id', { id });

    const [result] = await conn.execute<ResultSetHeader>(
      'DELETE FROM workers WHERE id = :id',
      { id }
    );
    if (result.affectedRows === 0) {
      throw new AppError('Worker not found', 404);
    }

    await conn.commit();
    return { deletedInvoices: invResult.affectedRows };
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

/** Ensure financial_configs.currency exists for older DBs. */
export async function ensureFinancialConfigCurrency(): Promise<void> {
  try {
    await pool.execute(
      `ALTER TABLE financial_configs
       ADD COLUMN currency ENUM('JPY','MMK','USD') NOT NULL DEFAULT 'JPY'
       AFTER billing_cycle_months`
    );
  } catch (err: any) {
    if (err?.code !== 'ER_DUP_FIELDNAME' && err?.errno !== 1060) {
      // ignore if table missing during first boot
    }
  }
}
