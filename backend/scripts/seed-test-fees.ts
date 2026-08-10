/**
 * Refresh sample Host Companies + school-based Student Introduction Fees
 * + host-based Worker fee invoices for UI testing.
 *
 * Safe to re-run: clears fee invoices/payments/lines, then reseeds.
 * Does not wipe workers/students/users (updates students to school model).
 *
 * Usage: npx tsx scripts/seed-test-fees.ts
 */
import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

function loadEnvFile(filePath: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!fs.existsSync(filePath)) return out;
  for (const line of fs.readFileSync(filePath, 'utf-8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    out[key] = val;
  }
  return out;
}

const HOSTS: Array<{ id: string; value: string; sort: number; parentOrg: string }> = [
  {
    id: 'var-host-1',
    value: 'Tanaka Precision Machinery Co., Ltd.',
    sort: 1,
    parentOrg: 'Japan Skill Cooperative (JSC)',
  },
  {
    id: 'var-host-2',
    value: 'Fuji Elderly Care Center Osaka',
    sort: 2,
    parentOrg: 'Kanto Caregiver Support Org',
  },
  {
    id: 'var-host-3',
    value: 'Yamada Construction Group',
    sort: 3,
    parentOrg: 'OTIT International Union',
  },
  {
    id: 'var-host-4',
    value: 'Nagoya Garment & Apparel Ltd.',
    sort: 4,
    parentOrg: 'Chubu Textile Association',
  },
  {
    id: 'var-host-5',
    value: 'Saitama Bento & Delica Inc.',
    sort: 5,
    parentOrg: 'Japan Skill Cooperative (JSC)',
  },
  {
    id: 'var-host-6',
    value: 'Kyoto Auto Parts Co., Ltd.',
    sort: 6,
    parentOrg: 'Japan Skill Cooperative (JSC)',
  },
  {
    id: 'var-host-7',
    value: 'Hokkaido Dairy Farm Association',
    sort: 7,
    parentOrg: 'OTIT International Union',
  },
  {
    id: 'var-host-8',
    value: 'Yokohama Logistics Hub K.K.',
    sort: 8,
    parentOrg: 'Japan Skill Cooperative (JSC)',
  },
];

const SCHOOLS: Array<{ id: string; value: string; sort: number; address: string }> = [
  {
    id: 'var-school-1',
    value: 'Tokyo Japanese Language Academy',
    sort: 1,
    address: '1-2-3 Shinjuku, Tokyo',
  },
  {
    id: 'var-school-2',
    value: 'Osaka International College',
    sort: 2,
    address: '4-5-6 Namba, Osaka',
  },
  {
    id: 'var-school-3',
    value: 'Nagoya Career School',
    sort: 3,
    address: '7-8-9 Sakae, Nagoya',
  },
  {
    id: 'var-school-4',
    value: 'Fukuoka Study Abroad Center',
    sort: 4,
    address: '2-1 Tenjin, Fukuoka',
  },
];

type StudentSeed = {
  id: string;
  serialNo: string;
  name: string;
  gender: 'Male' | 'Female';
  dob: string;
  passportNo: string;
  school: string;
  address: string;
  visaType: string;
  introductionFee: number;
  notes: string;
};

const STUDENTS: StudentSeed[] = [
  {
    id: 's-201',
    serialNo: 'S-2026-001',
    name: 'Hla Hla Win',
    gender: 'Female',
    dob: '2002-04-18',
    passportNo: 'ST123456',
    school: 'Tokyo Japanese Language Academy',
    address: '1-2-3 Shinjuku, Tokyo',
    visaType: 'TITP-1',
    introductionFee: 220000,
    notes: 'Tokyo school — introduction fee test student.',
  },
  {
    id: 's-202',
    serialNo: 'S-2026-002',
    name: 'Ko Ko Lwin',
    gender: 'Male',
    dob: '2001-12-09',
    passportNo: 'ST234567',
    school: 'Osaka International College',
    address: '4-5-6 Namba, Osaka',
    visaType: 'SSW-Food Processing',
    introductionFee: 250000,
    notes: 'Osaka school — introduction fee test student.',
  },
  {
    id: 's-203',
    serialNo: 'S-2026-003',
    name: 'Aye Aye Myint',
    gender: 'Female',
    dob: '2003-07-22',
    passportNo: 'ST345678',
    school: 'Tokyo Japanese Language Academy',
    address: '1-2-3 Shinjuku, Tokyo',
    visaType: 'TITP-1',
    introductionFee: 220000,
    notes: 'Tokyo school — second student for school invoice lines.',
  },
  {
    id: 's-204',
    serialNo: 'S-2026-004',
    name: 'Zaw Min Oo',
    gender: 'Male',
    dob: '2000-01-30',
    passportNo: 'ST456789',
    school: 'Tokyo Japanese Language Academy',
    address: '1-2-3 Shinjuku, Tokyo',
    visaType: 'SSW-Manufacturing',
    introductionFee: 230000,
    notes: 'Tokyo school — third student.',
  },
  {
    id: 's-205',
    serialNo: 'S-2026-005',
    name: 'May Thu',
    gender: 'Female',
    dob: '2002-09-05',
    passportNo: 'ST567890',
    school: 'Osaka International College',
    address: '4-5-6 Namba, Osaka',
    visaType: 'SSW-Caregiver',
    introductionFee: 240000,
    notes: 'Osaka school — second student.',
  },
  {
    id: 's-206',
    serialNo: 'S-2026-006',
    name: 'Nay Lin',
    gender: 'Male',
    dob: '2001-06-14',
    passportNo: 'ST678901',
    school: 'Nagoya Career School',
    address: '7-8-9 Sakae, Nagoya',
    visaType: 'TITP-2',
    introductionFee: 210000,
    notes: 'Nagoya school — paid invoice test.',
  },
  {
    id: 's-207',
    serialNo: 'S-2026-007',
    name: 'Su Myat',
    gender: 'Female',
    dob: '2003-11-11',
    passportNo: 'ST789012',
    school: 'Nagoya Career School',
    address: '7-8-9 Sakae, Nagoya',
    visaType: 'TITP-1',
    introductionFee: 210000,
    notes: 'Nagoya school — second student.',
  },
  {
    id: 's-208',
    serialNo: 'S-2026-008',
    name: 'Phone Myat',
    gender: 'Male',
    dob: '2002-02-28',
    passportNo: 'ST890123',
    school: 'Fukuoka Study Abroad Center',
    address: '2-1 Tenjin, Fukuoka',
    visaType: 'Engineering/Humanities',
    introductionFee: 260000,
    notes: 'Fukuoka school — pending invoice test.',
  },
];

type ExtraWorker = {
  id: string;
  serialNo: string;
  name: string;
  gender: 'Male' | 'Female';
  dob: string;
  passportNo: string;
  status: string;
  notes: string;
  visaType: string;
  supervisingOrg: string;
  hostCompany: string;
  jobCategory: string;
  ownCardDate: string;
  departureDate: string;
  japanEntryDate: string;
  contractEndDate: string;
  flightFee: number;
  trainingFee: number;
  managementFee: number;
};

/** Extra workers so hosts have multiple lines on invoices. */
const EXTRA_WORKERS: ExtraWorker[] = [
  {
    id: 'w-106',
    serialNo: 'W-2024-006',
    name: 'Htet Aung',
    gender: 'Male',
    dob: '1996-04-02',
    passportNo: 'MD678901',
    status: 'Active',
    notes: 'Second worker at Tanaka Precision — fee line test.',
    visaType: 'SSW-Manufacturing',
    supervisingOrg: 'Japan Skill Cooperative (JSC)',
    hostCompany: 'Tanaka Precision Machinery Co., Ltd.',
    jobCategory: 'Machining & Metal Works',
    ownCardDate: '2024-05-01',
    departureDate: '2024-07-01',
    japanEntryDate: '2024-07-02',
    contractEndDate: '2027-07-01',
    flightFee: 150000,
    trainingFee: 250000,
    managementFee: 30000,
  },
  {
    id: 'w-107',
    serialNo: 'W-2024-007',
    name: 'Khin Sandar',
    gender: 'Female',
    dob: '1998-12-19',
    passportNo: 'MD789012',
    status: 'Active',
    notes: 'Second caregiver at Fuji Elderly Care.',
    visaType: 'SSW-Caregiver',
    supervisingOrg: 'Kanto Caregiver Support Org',
    hostCompany: 'Fuji Elderly Care Center Osaka',
    jobCategory: 'Caregiver / Nursing Care',
    ownCardDate: '2024-06-10',
    departureDate: '2024-08-15',
    japanEntryDate: '2024-08-16',
    contractEndDate: '2027-08-15',
    flightFee: 160000,
    trainingFee: 280000,
    managementFee: 35000,
  },
  {
    id: 'w-108',
    serialNo: 'W-2024-008',
    name: 'Ye Min',
    gender: 'Male',
    dob: '1994-08-08',
    passportNo: 'MD890123',
    status: 'Active',
    notes: 'Kyoto Auto Parts worker for new host testing.',
    visaType: 'SSW-Manufacturing',
    supervisingOrg: 'Japan Skill Cooperative (JSC)',
    hostCompany: 'Kyoto Auto Parts Co., Ltd.',
    jobCategory: 'Machining & Metal Works',
    ownCardDate: '2025-01-10',
    departureDate: '2025-03-01',
    japanEntryDate: '2025-03-02',
    contractEndDate: '2028-03-01',
    flightFee: 155000,
    trainingFee: 240000,
    managementFee: 32000,
  },
];

async function ensureVariable(
  conn: mysql.Connection,
  id: string,
  category: string,
  value: string,
  sortOrder: number,
  parentValue: string | null = null
) {
  await conn.execute(
    `INSERT INTO system_variables (id, category, value, parent_value, sort_order, is_active)
     VALUES (?, ?, ?, ?, ?, 1)
     ON DUPLICATE KEY UPDATE
       value = VALUES(value),
       parent_value = COALESCE(VALUES(parent_value), parent_value),
       sort_order = VALUES(sort_order),
       is_active = 1`,
    [id, category, value, parentValue, sortOrder]
  );
}

async function upsertStudent(conn: mysql.Connection, s: StudentSeed) {
  await conn.execute(
    `INSERT INTO students (id, serial_no, name, gender, dob, passport_no, status, absconded_date, notes)
     VALUES (?, ?, ?, ?, ?, ?, 'Active', NULL, ?)
     ON DUPLICATE KEY UPDATE
       name = VALUES(name),
       gender = VALUES(gender),
       dob = VALUES(dob),
       passport_no = VALUES(passport_no),
       notes = VALUES(notes)`,
    [s.id, s.serialNo, s.name, s.gender, s.dob, s.passportNo, s.notes]
  );

  const depId = `sdep-${s.id.replace(/^s-/, '')}`;
  await conn.execute(`DELETE FROM student_deployments WHERE student_id = ?`, [s.id]);
  await conn.execute(
    `INSERT INTO student_deployments
      (id, student_id, visa_type, supervising_org, host_company, job_category,
       own_card_date, departure_date, japan_entry_date, contract_end_date)
     VALUES (?, ?, ?, ?, ?, '', NULL, NULL, NULL, NULL)`,
    [depId, s.id, s.visaType, s.school, s.address]
  );

  const finId = `sfin-${s.id.replace(/^s-/, '')}`;
  await conn.execute(`DELETE FROM student_financial_configs WHERE student_id = ?`, [s.id]);
  await conn.execute(
    `INSERT INTO student_financial_configs (id, student_id, introduction_fee)
     VALUES (?, ?, ?)`,
    [finId, s.id, s.introductionFee]
  );
}

async function ensureExtraWorkers(conn: mysql.Connection) {
  for (const w of EXTRA_WORKERS) {
    const [rows] = await conn.query<any[]>(
      `SELECT id FROM workers WHERE id = ? OR serial_no = ? LIMIT 1`,
      [w.id, w.serialNo]
    );
    if (rows.length) continue;

    await conn.execute(
      `INSERT INTO workers (id, serial_no, name, gender, dob, passport_no, status, absconded_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
      [w.id, w.serialNo, w.name, w.gender, w.dob, w.passportNo, w.status, w.notes]
    );
    await conn.execute(
      `INSERT INTO deployments
        (id, worker_id, visa_type, supervising_org, host_company, job_category,
         own_card_date, departure_date, japan_entry_date, contract_end_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        `dep-${w.id.replace(/^w-/, '')}`,
        w.id,
        w.visaType,
        w.supervisingOrg,
        w.hostCompany,
        w.jobCategory,
        w.ownCardDate,
        w.departureDate,
        w.japanEntryDate,
        w.contractEndDate,
      ]
    );
    await conn.execute(
      `INSERT INTO financial_configs
        (id, worker_id, flight_fee, training_fee, management_fee, billing_cycle_months, currency)
       VALUES (?, ?, ?, ?, ?, 6, 'JPY')`,
      [w.id.replace(/^w-/, 'fin-'), w.id, w.flightFee, w.trainingFee, w.managementFee]
    );
  }
}

async function clearStudentFees(conn: mysql.Connection) {
  await conn.query('DELETE FROM student_invoice_payments');
  await conn.query('DELETE FROM student_invoice_lines');
  await conn.query('DELETE FROM student_invoices');
}

async function clearWorkerFees(conn: mysql.Connection) {
  await conn.query('DELETE FROM invoice_payments');
  await conn.query('DELETE FROM invoice_lines');
  await conn.query('DELETE FROM invoices');
}

async function workersForHost(
  conn: mysql.Connection,
  hostCompany: string
): Promise<Array<{ id: string; name: string; managementFee: number; flightFee: number; trainingFee: number; supervisingOrg: string }>> {
  const [rows] = await conn.query<any[]>(
    `SELECT w.id, w.name,
            COALESCE(f.management_fee, 0) AS management_fee,
            COALESCE(f.flight_fee, 0) AS flight_fee,
            COALESCE(f.training_fee, 0) AS training_fee,
            COALESCE(d.supervising_org, '') AS supervising_org
     FROM workers w
     JOIN deployments d ON d.worker_id = w.id
     LEFT JOIN financial_configs f ON f.worker_id = w.id
     WHERE d.host_company = ?
     ORDER BY w.serial_no ASC`,
    [hostCompany]
  );
  return rows.map((r) => ({
    id: String(r.id),
    name: String(r.name),
    managementFee: Number(r.management_fee) || 0,
    flightFee: Number(r.flight_fee) || 0,
    trainingFee: Number(r.training_fee) || 0,
    supervisingOrg: String(r.supervising_org || ''),
  }));
}

async function insertHostInvoice(
  conn: mysql.Connection,
  opts: {
    id: string;
    invoiceNo: string;
    hostCompany: string;
    supervisingOrg: string;
    feeType: 'management' | 'flight' | 'training';
    billingPeriod: string;
    lastInvoiceDate: string;
    nextInvoiceDate: string;
    notes: string;
    lines: Array<{ workerId: string; amount: number }>;
    payments: Array<{
      id: string;
      amount: number;
      paymentDate: string;
      receiptNo: string;
      notes?: string;
    }>;
  }
) {
  const total = opts.lines.reduce((s, l) => s + l.amount, 0);
  const received = opts.payments.reduce((s, p) => s + p.amount, 0);
  const outstanding = Math.max(0, total - received);
  const status =
    received <= 0 ? 'Pending' : outstanding <= 0 ? 'Paid' : 'Partial';
  const lastPay = opts.payments[opts.payments.length - 1];

  await conn.execute(
    `INSERT INTO invoices
      (id, invoice_no, worker_id, host_company, supervising_org, fee_type, billing_period,
       last_invoice_date, next_invoice_date, total_amount, amount_received, outstanding_amount,
       payment_received_date, receipt_no, receipt_sent_date, status, currency, notes)
     VALUES (?, ?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 'JPY', ?)`,
    [
      opts.id,
      opts.invoiceNo,
      opts.hostCompany,
      opts.supervisingOrg,
      opts.feeType,
      opts.billingPeriod,
      opts.lastInvoiceDate,
      opts.nextInvoiceDate,
      total,
      received,
      outstanding,
      lastPay?.paymentDate || null,
      lastPay?.receiptNo || null,
      status,
      opts.notes,
    ]
  );

  for (const [i, line] of opts.lines.entries()) {
    await conn.execute(
      `INSERT INTO invoice_lines (id, invoice_id, worker_id, amount)
       VALUES (?, ?, ?, ?)`,
      [`${opts.id}-line-${i + 1}`, opts.id, line.workerId, line.amount]
    );
  }

  for (const p of opts.payments) {
    await conn.execute(
      `INSERT INTO invoice_payments
        (id, invoice_id, amount, payment_date, receipt_no, notes, currency)
       VALUES (?, ?, ?, ?, ?, ?, 'JPY')`,
      [p.id, opts.id, p.amount, p.paymentDate, p.receiptNo, p.notes || null]
    );
  }
}

async function insertSchoolInvoice(
  conn: mysql.Connection,
  opts: {
    id: string;
    invoiceNo: string;
    schoolName: string;
    billingPeriod: string;
    lastInvoiceDate: string;
    nextInvoiceDate: string;
    notes: string;
    lines: Array<{ studentId: string; amount: number }>;
    payments: Array<{
      id: string;
      amount: number;
      paymentDate: string;
      receiptNo: string;
      notes?: string;
    }>;
  }
) {
  const total = opts.lines.reduce((s, l) => s + l.amount, 0);
  const received = opts.payments.reduce((s, p) => s + p.amount, 0);
  const outstanding = Math.max(0, total - received);
  const status =
    received <= 0 ? 'Pending' : outstanding <= 0 ? 'Paid' : 'Partial';
  const lastPay = opts.payments[opts.payments.length - 1];

  await conn.execute(
    `INSERT INTO student_invoices
      (id, invoice_no, student_id, school_name, fee_type, billing_period,
       last_invoice_date, next_invoice_date, total_amount, amount_received, outstanding_amount,
       payment_received_date, receipt_no, receipt_sent_date, status, currency, notes)
     VALUES (?, ?, NULL, ?, 'introduction', ?, ?, ?, ?, ?, ?, ?, ?, NULL, ?, 'JPY', ?)`,
    [
      opts.id,
      opts.invoiceNo,
      opts.schoolName,
      opts.billingPeriod,
      opts.lastInvoiceDate,
      opts.nextInvoiceDate,
      total,
      received,
      outstanding,
      lastPay?.paymentDate || null,
      lastPay?.receiptNo || null,
      status,
      opts.notes,
    ]
  );

  for (const [i, line] of opts.lines.entries()) {
    await conn.execute(
      `INSERT INTO student_invoice_lines (id, invoice_id, student_id, amount)
       VALUES (?, ?, ?, ?)`,
      [`${opts.id}-line-${i + 1}`, opts.id, line.studentId, line.amount]
    );
  }

  for (const p of opts.payments) {
    await conn.execute(
      `INSERT INTO student_invoice_payments
        (id, invoice_id, amount, payment_date, receipt_no, notes, currency)
       VALUES (?, ?, ?, ?, ?, ?, 'JPY')`,
      [p.id, opts.id, p.amount, p.paymentDate, p.receiptNo, p.notes || null]
    );
  }
}

async function main() {
  const e = loadEnvFile(path.join(backendRoot, '.env'));
  const conn = await mysql.createConnection({
    host: e.DB_HOST || process.env.DB_HOST || 'localhost',
    port: Number(e.DB_PORT || process.env.DB_PORT || 3306),
    user: e.DB_USER || process.env.DB_USER || 'root',
    password: e.DB_PASSWORD ?? process.env.DB_PASSWORD ?? '',
    database: e.DB_NAME || process.env.DB_NAME || 'mt_agencyms',
    multipleStatements: true,
  });

  console.log('1) Seeding Host Company + School Name system variables…');
  try {
    await conn.query(
      `ALTER TABLE system_variables
       MODIFY category ENUM(
         'visa_type','supervising_org','host_company','job_category','school_name'
       ) NOT NULL`
    );
  } catch {
    /* already migrated */
  }
  try {
    await conn.query(
      `ALTER TABLE system_variables ADD COLUMN parent_value VARCHAR(200) NULL AFTER value`
    );
  } catch {
    /* already migrated */
  }

  for (const h of HOSTS) {
    // Prefer stable ids; if value exists under another id, keep existing row active
    const [existing] = await conn.query<any[]>(
      `SELECT id FROM system_variables WHERE category = 'host_company' AND value = ? LIMIT 1`,
      [h.value]
    );
    if (existing.length) {
      await conn.execute(
        `UPDATE system_variables
         SET is_active = 1, sort_order = ?, parent_value = ?
         WHERE id = ?`,
        [h.sort, h.parentOrg, existing[0].id]
      );
    } else {
      await ensureVariable(conn, h.id, 'host_company', h.value, h.sort, h.parentOrg);
    }
  }
  for (const s of SCHOOLS) {
    const [existing] = await conn.query<any[]>(
      `SELECT id FROM system_variables WHERE category = 'school_name' AND value = ? LIMIT 1`,
      [s.value]
    );
    if (existing.length) {
      await conn.execute(
        `UPDATE system_variables SET is_active = 1, sort_order = ? WHERE id = ?`,
        [s.sort, existing[0].id]
      );
    } else {
      await ensureVariable(conn, s.id, 'school_name', s.value, s.sort);
    }
  }

  console.log('2) Upserting students (school name / school address model)…');
  for (const s of STUDENTS) {
    await upsertStudent(conn, s);
  }

  console.log('3) Ensuring extra workers for multi-line host invoices…');
  await ensureExtraWorkers(conn);

  console.log('4) Clearing old Student Introduction Fees…');
  await clearStudentFees(conn);

  console.log('5) Seeding school-based Student Introduction Fee invoices…');
  const tokyoStudents = STUDENTS.filter((s) => s.school === 'Tokyo Japanese Language Academy');
  const osakaStudents = STUDENTS.filter((s) => s.school === 'Osaka International College');
  const nagoyaStudents = STUDENTS.filter((s) => s.school === 'Nagoya Career School');
  const fukuokaStudents = STUDENTS.filter((s) => s.school === 'Fukuoka Study Abroad Center');

  await insertSchoolInvoice(conn, {
    id: 'sinv-tokyo-001',
    invoiceNo: 'STU-INV-2026-001',
    schoolName: 'Tokyo Japanese Language Academy',
    billingPeriod: 'Introduction Fee — Tokyo Japanese Language Academy',
    lastInvoiceDate: '2026-03-01',
    nextInvoiceDate: '2026-09-01',
    notes: 'School invoice — Partial payment for color testing.',
    lines: tokyoStudents.map((s) => ({ studentId: s.id, amount: s.introductionFee })),
    payments: [
      {
        id: 'spay-tokyo-1',
        amount: 300000,
        paymentDate: '2026-03-15',
        receiptNo: 'STU-REC-001',
        notes: 'First installment',
      },
    ],
  });

  await insertSchoolInvoice(conn, {
    id: 'sinv-osaka-001',
    invoiceNo: 'STU-INV-2026-002',
    schoolName: 'Osaka International College',
    billingPeriod: 'Introduction Fee — Osaka International College',
    lastInvoiceDate: '2026-03-05',
    nextInvoiceDate: '2026-09-05',
    notes: 'School invoice — Pending (no payment yet).',
    lines: osakaStudents.map((s) => ({ studentId: s.id, amount: s.introductionFee })),
    payments: [],
  });

  await insertSchoolInvoice(conn, {
    id: 'sinv-nagoya-001',
    invoiceNo: 'STU-INV-2026-003',
    schoolName: 'Nagoya Career School',
    billingPeriod: 'Introduction Fee — Nagoya Career School',
    lastInvoiceDate: '2026-02-20',
    nextInvoiceDate: '2026-08-20',
    notes: 'School invoice — Fully paid.',
    lines: nagoyaStudents.map((s) => ({ studentId: s.id, amount: s.introductionFee })),
    payments: [
      {
        id: 'spay-nagoya-1',
        amount: 420000,
        paymentDate: '2026-03-01',
        receiptNo: 'STU-REC-003',
        notes: 'Paid in full',
      },
    ],
  });

  await insertSchoolInvoice(conn, {
    id: 'sinv-fukuoka-001',
    invoiceNo: 'STU-INV-2026-004',
    schoolName: 'Fukuoka Study Abroad Center',
    billingPeriod: 'Introduction Fee — Fukuoka Study Abroad Center',
    lastInvoiceDate: '2026-04-01',
    nextInvoiceDate: '2026-10-01',
    notes: 'School invoice — Pending.',
    lines: fukuokaStudents.map((s) => ({ studentId: s.id, amount: s.introductionFee })),
    payments: [],
  });

  console.log('6) Clearing old Worker fee invoices…');
  await clearWorkerFees(conn);

  console.log('7) Seeding host-based Worker fee invoices…');
  const tanaka = await workersForHost(conn, 'Tanaka Precision Machinery Co., Ltd.');
  const fuji = await workersForHost(conn, 'Fuji Elderly Care Center Osaka');
  const saitama = await workersForHost(conn, 'Saitama Bento & Delica Inc.');
  const kyoto = await workersForHost(conn, 'Kyoto Auto Parts Co., Ltd.');
  const yamada = await workersForHost(conn, 'Yamada Construction Group');

  if (tanaka.length) {
    const org = tanaka[0].supervisingOrg || 'Japan Skill Cooperative (JSC)';
    await insertHostInvoice(conn, {
      id: 'inv-host-tanaka-mgmt',
      invoiceNo: 'INV-2026-101',
      hostCompany: 'Tanaka Precision Machinery Co., Ltd.',
      supervisingOrg: org,
      feeType: 'management',
      billingPeriod: '2026 H1 — Tanaka Precision',
      lastInvoiceDate: '2026-01-15',
      nextInvoiceDate: '2026-07-15',
      notes: 'Management fee — Partial (green/amber color test).',
      lines: tanaka.map((w) => ({
        workerId: w.id,
        amount: w.managementFee > 0 ? w.managementFee * 6 : 30000 * 6,
      })),
      payments: [
        {
          id: 'pay-tanaka-mgmt-1',
          amount: 100000,
          paymentDate: '2026-02-10',
          receiptNo: 'REC-2026-101',
          notes: 'Partial management payment',
        },
      ],
    });

    await insertHostInvoice(conn, {
      id: 'inv-host-tanaka-flight',
      invoiceNo: 'INV-2026-102',
      hostCompany: 'Tanaka Precision Machinery Co., Ltd.',
      supervisingOrg: org,
      feeType: 'flight',
      billingPeriod: 'Flight Fee — Tanaka Precision',
      lastInvoiceDate: '2026-01-20',
      nextInvoiceDate: '2026-07-20',
      notes: 'Flight fee — Fully paid.',
      lines: tanaka.map((w) => ({
        workerId: w.id,
        amount: w.flightFee > 0 ? w.flightFee : 150000,
      })),
      payments: [
        {
          id: 'pay-tanaka-flight-1',
          amount: tanaka.reduce((s, w) => s + (w.flightFee || 150000), 0),
          paymentDate: '2026-02-01',
          receiptNo: 'REC-2026-102',
          notes: 'Flight fees paid in full',
        },
      ],
    });
  }

  if (fuji.length) {
    const org = fuji[0].supervisingOrg || 'Kanto Caregiver Support Org';
    await insertHostInvoice(conn, {
      id: 'inv-host-fuji-mgmt',
      invoiceNo: 'INV-2026-201',
      hostCompany: 'Fuji Elderly Care Center Osaka',
      supervisingOrg: org,
      feeType: 'management',
      billingPeriod: '2026 H1 — Fuji Elderly Care',
      lastInvoiceDate: '2026-01-20',
      nextInvoiceDate: '2026-07-20',
      notes: 'Management fee — Pending.',
      lines: fuji.map((w) => ({
        workerId: w.id,
        amount: w.managementFee > 0 ? w.managementFee * 6 : 35000 * 6,
      })),
      payments: [],
    });

    await insertHostInvoice(conn, {
      id: 'inv-host-fuji-training',
      invoiceNo: 'INV-2026-202',
      hostCompany: 'Fuji Elderly Care Center Osaka',
      supervisingOrg: org,
      feeType: 'training',
      billingPeriod: 'Training Fee — Fuji Elderly Care',
      lastInvoiceDate: '2026-02-01',
      nextInvoiceDate: '2026-08-01',
      notes: 'Training fee — Partial.',
      lines: fuji.map((w) => ({
        workerId: w.id,
        amount: w.trainingFee > 0 ? w.trainingFee : 280000,
      })),
      payments: [
        {
          id: 'pay-fuji-train-1',
          amount: 150000,
          paymentDate: '2026-02-20',
          receiptNo: 'REC-2026-202',
          notes: 'Training installment 1',
        },
      ],
    });
  }

  if (saitama.length) {
    const org = saitama[0].supervisingOrg || 'Japan Skill Cooperative (JSC)';
    await insertHostInvoice(conn, {
      id: 'inv-host-saitama-mgmt',
      invoiceNo: 'INV-2026-301',
      hostCompany: 'Saitama Bento & Delica Inc.',
      supervisingOrg: org,
      feeType: 'management',
      billingPeriod: '2026 H1 — Saitama Bento',
      lastInvoiceDate: '2026-01-10',
      nextInvoiceDate: '2026-07-10',
      notes: 'Management fee — Fully paid.',
      lines: saitama.map((w) => ({
        workerId: w.id,
        amount: w.managementFee > 0 ? w.managementFee * 6 : 30000 * 6,
      })),
      payments: [
        {
          id: 'pay-saitama-mgmt-1',
          amount: saitama.reduce(
            (s, w) => s + (w.managementFee > 0 ? w.managementFee * 6 : 180000),
            0
          ),
          paymentDate: '2026-03-01',
          receiptNo: 'REC-2026-301',
          notes: 'Paid in full',
        },
      ],
    });
  }

  if (kyoto.length) {
    const org = kyoto[0].supervisingOrg || 'Japan Skill Cooperative (JSC)';
    await insertHostInvoice(conn, {
      id: 'inv-host-kyoto-mgmt',
      invoiceNo: 'INV-2026-401',
      hostCompany: 'Kyoto Auto Parts Co., Ltd.',
      supervisingOrg: org,
      feeType: 'management',
      billingPeriod: '2026 H1 — Kyoto Auto Parts',
      lastInvoiceDate: '2026-03-01',
      nextInvoiceDate: '2026-09-01',
      notes: 'New host — Pending management fee.',
      lines: kyoto.map((w) => ({
        workerId: w.id,
        amount: w.managementFee > 0 ? w.managementFee * 6 : 32000 * 6,
      })),
      payments: [],
    });

    await insertHostInvoice(conn, {
      id: 'inv-host-kyoto-flight',
      invoiceNo: 'INV-2026-402',
      hostCompany: 'Kyoto Auto Parts Co., Ltd.',
      supervisingOrg: org,
      feeType: 'flight',
      billingPeriod: 'Flight Fee — Kyoto Auto Parts',
      lastInvoiceDate: '2026-03-01',
      nextInvoiceDate: '2026-09-01',
      notes: 'Flight fee — Partial.',
      lines: kyoto.map((w) => ({
        workerId: w.id,
        amount: w.flightFee > 0 ? w.flightFee : 155000,
      })),
      payments: [
        {
          id: 'pay-kyoto-flight-1',
          amount: 50000,
          paymentDate: '2026-03-10',
          receiptNo: 'REC-2026-402',
        },
      ],
    });
  }

  if (yamada.length) {
    const org = yamada[0].supervisingOrg || 'OTIT International Union';
    await insertHostInvoice(conn, {
      id: 'inv-host-yamada-mgmt',
      invoiceNo: 'INV-2026-501',
      hostCompany: 'Yamada Construction Group',
      supervisingOrg: org,
      feeType: 'management',
      billingPeriod: '2026 H1 — Yamada Construction',
      lastInvoiceDate: '2026-01-05',
      nextInvoiceDate: '2026-07-05',
      notes: 'Contract-ended host — Paid.',
      lines: yamada.map((w) => ({
        workerId: w.id,
        amount: w.managementFee > 0 ? w.managementFee * 6 : 25000 * 6,
      })),
      payments: [
        {
          id: 'pay-yamada-mgmt-1',
          amount: yamada.reduce(
            (s, w) => s + (w.managementFee > 0 ? w.managementFee * 6 : 150000),
            0
          ),
          paymentDate: '2026-02-28',
          receiptNo: 'REC-2026-501',
        },
      ],
    });
  }

  const [hostCount] = await conn.query<any[]>(
    `SELECT COUNT(*) AS c FROM system_variables WHERE category='host_company' AND is_active=1`
  );
  const [stuInv] = await conn.query<any[]>(`SELECT COUNT(*) AS c FROM student_invoices`);
  const [stuLines] = await conn.query<any[]>(`SELECT COUNT(*) AS c FROM student_invoice_lines`);
  const [wInv] = await conn.query<any[]>(`SELECT COUNT(*) AS c FROM invoices`);
  const [wLines] = await conn.query<any[]>(`SELECT COUNT(*) AS c FROM invoice_lines`);

  console.log('Done.');
  console.log(`  Host companies: ${hostCount[0].c}`);
  console.log(`  Student invoices: ${stuInv[0].c} (${stuLines[0].c} lines)`);
  console.log(`  Worker invoices: ${wInv[0].c} (${wLines[0].c} lines)`);

  await conn.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
