import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { pool } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';
import type { Student, WorkerStatus } from '../types/index.js';
import { newId, num, toDateStr, toIso } from '../utils/helpers.js';

interface StudentRow extends RowDataPacket {
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
  introduction_fee: number | null;
}

function mapStudent(row: StudentRow): Student {
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
      introductionFee: num(row.introduction_fee),
    },
    createdAt: toIso(row.created_at),
    updatedAt: toIso(row.updated_at),
  };
}

const STUDENT_SELECT = `
  SELECT s.*,
    d.visa_type, d.supervising_org, d.host_company, d.job_category,
    d.own_card_date, d.departure_date, d.japan_entry_date, d.contract_end_date,
    f.introduction_fee
  FROM students s
  LEFT JOIN student_deployments d ON d.student_id = s.id
  LEFT JOIN student_financial_configs f ON f.student_id = s.id
`;

export async function listStudents(filters: {
  status?: string;
  visaType?: string;
  search?: string;
  expiringDays?: string;
}): Promise<Student[]> {
  const where: string[] = [];
  const params: Record<string, string | number> = {};

  if (filters.status) {
    where.push('s.status = :status');
    params.status = filters.status;
  }
  if (filters.visaType) {
    where.push('d.visa_type = :visaType');
    params.visaType = filters.visaType;
  }
  if (filters.search) {
    where.push(`(
      LOWER(s.name) LIKE :q OR LOWER(s.serial_no) LIKE :q OR LOWER(s.passport_no) LIKE :q
      OR LOWER(d.host_company) LIKE :q OR LOWER(d.supervising_org) LIKE :q
    )`);
    params.q = `%${filters.search.toLowerCase().trim()}%`;
  }
  if (filters.expiringDays) {
    const days = parseInt(filters.expiringDays, 10);
    where.push(`s.status = 'Active'`);
    where.push(`d.contract_end_date BETWEEN CURDATE() AND DATE_ADD(CURDATE(), INTERVAL :expDays DAY)`);
    params.expDays = days;
  }

  const sql = `${STUDENT_SELECT}${where.length ? ` WHERE ${where.join(' AND ')}` : ''} ORDER BY s.created_at DESC`;
  const [rows] = await pool.query<StudentRow[]>(sql, params);
  return rows.map(mapStudent);
}

export async function getStudentById(id: string): Promise<Student | null> {
  const [rows] = await pool.query<StudentRow[]>(`${STUDENT_SELECT} WHERE s.id = :id LIMIT 1`, { id });
  return rows[0] ? mapStudent(rows[0]) : null;
}

export async function createStudent(body: Partial<Student>): Promise<Student> {
  if (!body.name?.trim()) {
    throw new AppError('ကျောင်းသား အမည် ထည့်သွင်းပါ။', 400);
  }
  if (!body.passportNo?.trim()) {
    throw new AppError('Passport နံပါတ် ထည့်သွင်းပါ။', 400);
  }
  const dep = body.deployment;
  if (!dep?.visaType || !dep?.supervisingOrg?.trim() || !dep?.hostCompany?.trim()) {
    throw new AppError('Visa / School Name / School Address ကို ဖြည့်ပါ။', 400);
  }

  const id = newId('s');
  const depId = newId('sdep');
  const finId = newId('sfin');
  const year = new Date().getFullYear();

  const [countRows] = await pool.query<RowDataPacket[]>(
    'SELECT COUNT(*) AS c FROM students WHERE serial_no LIKE :prefix',
    { prefix: `S-${year}-%` }
  );
  const serialNo =
    body.serialNo || `S-${year}-${String(Number(countRows[0].c) + 1).padStart(3, '0')}`;

  const status = (body.status || 'Active') as WorkerStatus;
  const abscondedDate =
    status === 'Absconded'
      ? body.abscondedDate || new Date().toISOString().split('T')[0]
      : null;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    await conn.execute<ResultSetHeader>(
      `INSERT INTO students
        (id, serial_no, name, gender, dob, passport_no, status, absconded_date, notes)
       VALUES (:id, :serialNo, :name, :gender, :dob, :passportNo, :status, :abscondedDate, :notes)`,
      {
        id,
        serialNo,
        name: body.name || 'Unnamed Student',
        gender: body.gender || 'Male',
        dob: body.dob || '2000-01-01',
        passportNo: body.passportNo || '',
        status,
        abscondedDate,
        notes: body.notes || '',
      }
    );

    await conn.execute(
      `INSERT INTO student_deployments
        (id, student_id, visa_type, supervising_org, host_company, job_category,
         own_card_date, departure_date, japan_entry_date, contract_end_date)
       VALUES (:id, :studentId, :visaType, :supervisingOrg, :hostCompany, :jobCategory,
         NULLIF(:ownCardDate, ''), NULLIF(:departureDate, ''), NULLIF(:japanEntryDate, ''), NULLIF(:contractEndDate, ''))`,
      {
        id: depId,
        studentId: id,
        visaType: dep.visaType || 'TITP-1',
        supervisingOrg: dep.supervisingOrg.trim(),
        hostCompany: dep.hostCompany.trim(),
        jobCategory: '',
        ownCardDate: '',
        departureDate: dep.departureDate || '',
        japanEntryDate: dep.japanEntryDate || '',
        contractEndDate: '',
      }
    );

    const fin = body.financialConfig || { introductionFee: 0 };
    await conn.execute(
      `INSERT INTO student_financial_configs
        (id, student_id, introduction_fee)
       VALUES (:id, :studentId, :introductionFee)`,
      {
        id: finId,
        studentId: id,
        introductionFee: num(fin.introductionFee),
      }
    );

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  const created = await getStudentById(id);
  if (!created) throw new AppError('Failed to create student', 500);
  return created;
}

export async function updateStudent(id: string, body: Partial<Student>): Promise<Student> {
  const existing = await getStudentById(id);
  if (!existing) throw new AppError('Student not found', 404);

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
      `UPDATE students SET
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
      `UPDATE student_deployments SET
        visa_type = :visaType, supervising_org = :supervisingOrg, host_company = :hostCompany,
        job_category = :jobCategory, own_card_date = NULLIF(:ownCardDate, ''),
        departure_date = NULLIF(:departureDate, ''), japan_entry_date = NULLIF(:japanEntryDate, ''),
        contract_end_date = NULLIF(:contractEndDate, '')
       WHERE student_id = :id`,
      {
        id,
        visaType: deployment.visaType,
        supervisingOrg: deployment.supervisingOrg || '',
        hostCompany: deployment.hostCompany || '',
        jobCategory: '',
        ownCardDate: '',
        departureDate: deployment.departureDate || '',
        japanEntryDate: deployment.japanEntryDate || '',
        contractEndDate: '',
      }
    );

    await conn.execute(
      `UPDATE student_financial_configs SET
        introduction_fee = :introductionFee
       WHERE student_id = :id`,
      {
        id,
        introductionFee: num(financial.introductionFee),
      }
    );

    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  const updated = await getStudentById(id);
  if (!updated) throw new AppError('Student not found after update', 404);
  return updated;
}

export async function getStudentRelated(id: string): Promise<{
  studentId: string;
  studentName: string;
  serialNo: string;
  invoiceCount: number;
  invoices: { id: string; invoiceNo: string; status: string; outstandingAmount: number }[];
  hasRelated: boolean;
}> {
  const student = await getStudentById(id);
  if (!student) throw new AppError('Student not found', 404);

  const [rows] = await pool.query<RowDataPacket[]>(
    `SELECT id, invoice_no, status, outstanding_amount
     FROM student_invoices
     WHERE student_id = :id
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
    studentId: student.id,
    studentName: student.name,
    serialNo: student.serialNo,
    invoiceCount: invoices.length,
    invoices,
    hasRelated: invoices.length > 0,
  };
}

export async function deleteStudent(id: string): Promise<{ deletedInvoices: number }> {
  const existing = await getStudentById(id);
  if (!existing) throw new AppError('Student not found', 404);

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();

    const [invResult] = await conn.execute<ResultSetHeader>(
      'DELETE FROM student_invoices WHERE student_id = :id',
      { id }
    );
    await conn.execute('DELETE FROM student_deployments WHERE student_id = :id', { id });
    await conn.execute('DELETE FROM student_financial_configs WHERE student_id = :id', { id });

    const [result] = await conn.execute<ResultSetHeader>(
      'DELETE FROM students WHERE id = :id',
      { id }
    );
    if (result.affectedRows === 0) {
      throw new AppError('Student not found', 404);
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
