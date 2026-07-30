import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import { listVariables } from './settingsService.js';
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

function normStr(v: unknown): string {
  if (v === null || v === undefined) return '';
  return String(v).trim();
}

function matchSetting(value: string, allowed: Set<string>): boolean {
  if (!value) return false;
  if (allowed.has(value)) return true;
  const lower = value.toLowerCase();
  for (const a of allowed) {
    if (a.toLowerCase() === lower) return true;
  }
  return false;
}

function resolveSetting(value: string, allowed: Set<string>): string {
  if (allowed.has(value)) return value;
  const lower = value.toLowerCase();
  for (const a of allowed) {
    if (a.toLowerCase() === lower) return a;
  }
  return value;
}

/**
 * Bulk-create workers in one transaction.
 * Validates Visa / Supervising Org / Host Company / Job Category against active Settings.
 * On any validation or DB error: no rows inserted (rollback) and warnings returned.
 */
export async function importWorkers(
  rows: Array<Partial<Worker> & { _row?: number }>
): Promise<{ imported: number; workers: Worker[] }> {
  if (!Array.isArray(rows) || rows.length === 0) {
    throw new AppError('Import လုပ်ရန် အချက်အလက် မရှိပါ။', 400);
  }

  const variables = await listVariables(undefined, true);
  const visaSet = new Set(
    variables.filter((v) => v.category === 'visa_type').map((v) => v.value)
  );
  const orgSet = new Set(
    variables.filter((v) => v.category === 'supervising_org').map((v) => v.value)
  );
  const hostSet = new Set(
    variables.filter((v) => v.category === 'host_company').map((v) => v.value)
  );
  const jobSet = new Set(
    variables.filter((v) => v.category === 'job_category').map((v) => v.value)
  );

  const warnings: string[] = [];
  const seenSerial = new Map<string, number>();
  const seenPassport = new Map<string, number>();

  const normalized: Array<{
    rowNum: number;
    body: Partial<Worker>;
  }> = [];

  for (let i = 0; i < rows.length; i++) {
    const raw = rows[i];
    const rowNum = typeof raw._row === 'number' && raw._row > 0 ? raw._row : i + 2;
    const name = normStr(raw.name);
    const passportNo = normStr(raw.passportNo);
    const genderRaw = normStr(raw.gender);
    const statusRaw = normStr(raw.status) || 'Active';
    const dep = raw.deployment || ({} as Worker['deployment']);
    const visaType = normStr(dep.visaType);
    const supervisingOrg = normStr(dep.supervisingOrg);
    const hostCompany = normStr(dep.hostCompany);
    const jobCategory = normStr(dep.jobCategory);
    const serialNo = normStr(raw.serialNo);
    const currencyRaw = normStr(raw.financialConfig?.currency) || 'JPY';

    if (!name) warnings.push(`Row ${rowNum}: အမည် (Name) မရှိပါ`);
    if (!passportNo) warnings.push(`Row ${rowNum}: Passport နံပါတ် မရှိပါ`);

    if (genderRaw && genderRaw !== 'Male' && genderRaw !== 'Female') {
      warnings.push(`Row ${rowNum}: Gender သည် Male သို့မဟုတ် Female ဖြစ်ရမည် ("${genderRaw}")`);
    }

    const validStatuses: WorkerStatus[] = ['Active', 'Contract Ended', 'Absconded'];
    if (!validStatuses.includes(statusRaw as WorkerStatus)) {
      warnings.push(
        `Row ${rowNum}: Status မှားနေပါသည် ("${statusRaw}") — Active / Contract Ended / Absconded`
      );
    }

    if (!visaType) {
      warnings.push(`Row ${rowNum}: Visa Type မရှိပါ`);
    } else if (!matchSetting(visaType, visaSet)) {
      warnings.push(
        `Row ${rowNum}: Visa Type "${visaType}" သည် Settings တွင် မရှိပါ (သို့မဟုတ် inactive)`
      );
    }

    if (!supervisingOrg) {
      warnings.push(`Row ${rowNum}: Supervising Org မရှိပါ`);
    } else if (!matchSetting(supervisingOrg, orgSet)) {
      warnings.push(
        `Row ${rowNum}: Supervising Org "${supervisingOrg}" သည် Settings တွင် မရှိပါ (သို့မဟုတ် inactive)`
      );
    }

    if (!hostCompany) {
      warnings.push(`Row ${rowNum}: Host Company မရှိပါ`);
    } else if (!matchSetting(hostCompany, hostSet)) {
      warnings.push(
        `Row ${rowNum}: Host Company "${hostCompany}" သည် Settings တွင် မရှိပါ (သို့မဟုတ် inactive)`
      );
    }

    if (!jobCategory) {
      warnings.push(`Row ${rowNum}: Job Category မရှိပါ`);
    } else if (!matchSetting(jobCategory, jobSet)) {
      warnings.push(
        `Row ${rowNum}: Job Category "${jobCategory}" သည် Settings တွင် မရှိပါ (သို့မဟုတ် inactive)`
      );
    }

    if (currencyRaw !== 'JPY' && currencyRaw !== 'MMK' && currencyRaw !== 'USD') {
      warnings.push(`Row ${rowNum}: Currency မှားနေပါသည် ("${currencyRaw}") — JPY / MMK / USD`);
    }

    if (serialNo) {
      const key = serialNo.toLowerCase();
      if (seenSerial.has(key)) {
        warnings.push(
          `Row ${rowNum}: Serial No "${serialNo}" သည် Row ${seenSerial.get(key)} နှင့် ထပ်နေပါသည်`
        );
      } else {
        seenSerial.set(key, rowNum);
      }
    }

    if (passportNo) {
      const key = passportNo.toLowerCase();
      if (seenPassport.has(key)) {
        warnings.push(
          `Row ${rowNum}: Passport "${passportNo}" သည် Row ${seenPassport.get(key)} နှင့် ထပ်နေပါသည်`
        );
      } else {
        seenPassport.set(key, rowNum);
      }
    }

    normalized.push({
      rowNum,
      body: {
        serialNo: serialNo || undefined,
        name,
        gender: genderRaw === 'Female' ? 'Female' : 'Male',
        dob: normStr(raw.dob) || '2000-01-01',
        passportNo,
        status: (validStatuses.includes(statusRaw as WorkerStatus)
          ? statusRaw
          : 'Active') as WorkerStatus,
        abscondedDate: normStr(raw.abscondedDate) || undefined,
        notes: normStr(raw.notes),
        deployment: {
          visaType: resolveSetting(visaType, visaSet),
          supervisingOrg: resolveSetting(supervisingOrg, orgSet),
          hostCompany: resolveSetting(hostCompany, hostSet),
          jobCategory: resolveSetting(jobCategory, jobSet),
          ownCardDate: normStr(dep.ownCardDate),
          departureDate: normStr(dep.departureDate),
          japanEntryDate: normStr(dep.japanEntryDate),
          contractEndDate: normStr(dep.contractEndDate),
        },
        financialConfig: {
          flightFee: num(raw.financialConfig?.flightFee, 150000),
          trainingFee: num(raw.financialConfig?.trainingFee, 250000),
          managementFee: num(raw.financialConfig?.managementFee, 30000),
          billingCycleMonths: num(raw.financialConfig?.billingCycleMonths, 6),
          currency: (currencyRaw === 'MMK' || currencyRaw === 'USD' ? currencyRaw : 'JPY') as
            | 'JPY'
            | 'MMK'
            | 'USD',
        },
      },
    });
  }

  // Check existing serial / passport conflicts before insert
  const serials = normalized.map((n) => n.body.serialNo).filter(Boolean) as string[];
  const passports = normalized.map((n) => n.body.passportNo).filter(Boolean) as string[];

  if (serials.length) {
    const placeholders = serials.map((_, i) => `:s${i}`).join(',');
    const params: Record<string, string> = {};
    serials.forEach((s, i) => {
      params[`s${i}`] = s;
    });
    const [existing] = await pool.query<RowDataPacket[]>(
      `SELECT serial_no FROM workers WHERE serial_no IN (${placeholders})`,
      params
    );
    const existingSet = new Set(existing.map((r) => String(r.serial_no).toLowerCase()));
    for (const n of normalized) {
      if (n.body.serialNo && existingSet.has(n.body.serialNo.toLowerCase())) {
        warnings.push(
          `Row ${n.rowNum}: Serial No "${n.body.serialNo}" သည် စနစ်ထဲတွင် ရှိပြီးသား ဖြစ်နေပါသည်`
        );
      }
    }
  }

  if (passports.length) {
    const placeholders = passports.map((_, i) => `:p${i}`).join(',');
    const params: Record<string, string> = {};
    passports.forEach((p, i) => {
      params[`p${i}`] = p;
    });
    const [existing] = await pool.query<RowDataPacket[]>(
      `SELECT passport_no FROM workers WHERE passport_no IN (${placeholders})`,
      params
    );
    const existingSet = new Set(existing.map((r) => String(r.passport_no).toLowerCase()));
    for (const n of normalized) {
      if (n.body.passportNo && existingSet.has(n.body.passportNo.toLowerCase())) {
        warnings.push(
          `Row ${n.rowNum}: Passport "${n.body.passportNo}" သည် စနစ်ထဲတွင် ရှိပြီးသား ဖြစ်နေပါသည်`
        );
      }
    }
  }

  if (warnings.length) {
    throw new AppError(
      'Excel Import မအောင်မြင်ပါ — Settings နှင့် မကိုက်ညီသော (သို့) မပြည့်စုံသော အချက်အလက်များ ရှိနေသောကြောင့် data insert မလုပ်ဘဲ rollback လုပ်ထားပါသည်။',
      400,
      warnings
    );
  }

  const year = new Date().getFullYear();
  const conn = await pool.getConnection();
  const createdIds: string[] = [];

  try {
    await conn.beginTransaction();

    const [countRows] = await conn.query<RowDataPacket[]>(
      'SELECT COUNT(*) AS c FROM workers WHERE serial_no LIKE :prefix',
      { prefix: `W-${year}-%` }
    );
    let nextSeq = Number(countRows[0].c) + 1;

    for (const n of normalized) {
      const id = newId('w');
      const depId = newId('dep');
      const finId = newId('fin');
      const body = n.body;
      const serialNo =
        body.serialNo || `W-${year}-${String(nextSeq).padStart(3, '0')}`;
      if (!body.serialNo) nextSeq += 1;

      const status = (body.status || 'Active') as WorkerStatus;
      const abscondedDate =
        status === 'Absconded'
          ? body.abscondedDate || new Date().toISOString().split('T')[0]
          : null;

      await conn.execute<ResultSetHeader>(
        `INSERT INTO workers
          (id, serial_no, name, gender, dob, passport_no, status, absconded_date, notes)
         VALUES (:id, :serialNo, :name, :gender, :dob, :passportNo, :status, :abscondedDate, :notes)`,
        {
          id,
          serialNo,
          name: body.name || '',
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
          visaType: dep.visaType,
          supervisingOrg: dep.supervisingOrg,
          hostCompany: dep.hostCompany,
          jobCategory: dep.jobCategory,
          ownCardDate: dep.ownCardDate || '',
          departureDate: dep.departureDate || '',
          japanEntryDate: dep.japanEntryDate || '',
          contractEndDate: dep.contractEndDate || '',
        }
      );

      const fin = body.financialConfig!;
      await conn.execute(
        `INSERT INTO financial_configs
          (id, worker_id, flight_fee, training_fee, management_fee, billing_cycle_months, currency)
         VALUES (:id, :workerId, :flightFee, :trainingFee, :managementFee, :billingCycleMonths, :currency)`,
        {
          id: finId,
          workerId: id,
          flightFee: num(fin.flightFee, 150000),
          trainingFee: num(fin.trainingFee, 250000),
          managementFee: num(fin.managementFee, 30000),
          billingCycleMonths: num(fin.billingCycleMonths, 6),
          currency: fin.currency || 'JPY',
        }
      );

      createdIds.push(id);
    }

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  const workers: Worker[] = [];
  for (const id of createdIds) {
    const w = await getWorkerById(id);
    if (w) workers.push(w);
  }

  return { imported: workers.length, workers };
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
