import fs from 'fs';
import path from 'path';
import mysql from 'mysql2/promise';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const backendRoot = path.resolve(__dirname, '..');

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

const fileEnv = loadEnvFile(path.join(backendRoot, '.env'));
const DB_HOST = fileEnv.DB_HOST || process.env.DB_HOST || 'localhost';
const DB_PORT = Number(fileEnv.DB_PORT || process.env.DB_PORT || 3306);
const DB_USER = fileEnv.DB_USER || process.env.DB_USER || 'root';
const DB_PASSWORD = fileEnv.DB_PASSWORD ?? process.env.DB_PASSWORD ?? '';
const DB_NAME = fileEnv.DB_NAME || process.env.DB_NAME || 'mt_agencyms';

function splitSql(sql: string): string[] {
  return sql
    .split(/;\s*\n/)
    .map((s) =>
      s
        .split('\n')
        .filter((line) => !line.trim().startsWith('--'))
        .join('\n')
        .trim()
    )
    .filter(Boolean);
}

async function main() {
  const root = await mysql.createConnection({
    host: DB_HOST,
    port: DB_PORT,
    user: DB_USER,
    password: DB_PASSWORD,
    multipleStatements: true,
  });

  await root.query(
    `CREATE DATABASE IF NOT EXISTS \`${DB_NAME}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`
  );
  await root.query(`USE \`${DB_NAME}\``);

  const schemaSql = fs.readFileSync(path.join(backendRoot, 'schema.sql'), 'utf-8');
  for (const stmt of splitSql(schemaSql)) {
    try {
      await root.query(stmt);
    } catch (err: any) {
      // Ignore duplicate index on re-run
      if (err?.code === 'ER_DUP_KEYNAME' || err?.errno === 1061) continue;
      throw err;
    }
  }

  // Migrate older invoice tables created without currency
  try {
    await root.query(
      `ALTER TABLE invoices ADD COLUMN currency ENUM('JPY','MMK','USD') NOT NULL DEFAULT 'JPY' AFTER status`
    );
  } catch (err: any) {
    if (err?.code !== 'ER_DUP_FIELDNAME' && err?.errno !== 1060) throw err;
  }

  try {
    await root.query(
      `ALTER TABLE financial_configs ADD COLUMN currency ENUM('JPY','MMK','USD') NOT NULL DEFAULT 'JPY' AFTER billing_cycle_months`
    );
  } catch (err: any) {
    if (err?.code !== 'ER_DUP_FIELDNAME' && err?.errno !== 1060) throw err;
  }

  try {
    await root.query(`ALTER TABLE invoices ADD COLUMN notes TEXT NULL AFTER currency`);
  } catch (err: any) {
    if (err?.code !== 'ER_DUP_FIELDNAME' && err?.errno !== 1060) throw err;
  }

  try {
    await root.query(`ALTER TABLE users ADD COLUMN permissions JSON NULL AFTER is_active`);
  } catch (err: any) {
    if (err?.code !== 'ER_DUP_FIELDNAME' && err?.errno !== 1060) throw err;
  }

  try {
    await root.query(
      `ALTER TABLE system_variables
       MODIFY category ENUM(
         'visa_type',
         'supervising_org',
         'host_company',
         'job_category',
         'school_name'
       ) NOT NULL`
    );
  } catch (err: any) {
    console.warn('system_variables.school_name migrate skipped:', err?.code || err?.message);
  }

  try {
    await root.query(
      `CREATE TABLE IF NOT EXISTS currency_settings (
        id TINYINT PRIMARY KEY DEFAULT 1,
        jpy_to_mmk_rate DECIMAL(18, 6) NOT NULL DEFAULT 20,
        display_currency ENUM('JPY', 'MMK') NOT NULL DEFAULT 'JPY',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`
    );
    await root.query(
      `INSERT IGNORE INTO currency_settings (id, jpy_to_mmk_rate, display_currency)
       VALUES (1, 20, 'JPY')`
    );
  } catch (err: any) {
    console.warn('currency_settings migrate skipped:', err?.code || err?.message);
  }

  try {
    await root.query(
      `ALTER TABLE invoices
       ADD COLUMN fee_type ENUM('management','flight','training') NOT NULL DEFAULT 'management'
       AFTER worker_id`
    );
  } catch (err: any) {
    if (err?.code !== 'ER_DUP_FIELDNAME' && err?.errno !== 1060) {
      console.warn('invoices.fee_type migrate skipped:', err?.code || err?.message);
    }
  }

  try {
    await root.query(
      `CREATE TABLE IF NOT EXISTS fee_payments (
        id VARCHAR(64) PRIMARY KEY,
        worker_id VARCHAR(64) NOT NULL,
        fee_type ENUM('flight', 'training') NOT NULL,
        amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        payment_date DATE NOT NULL,
        receipt_no VARCHAR(50) NULL,
        notes TEXT NULL,
        currency ENUM('JPY', 'MMK', 'USD') NOT NULL DEFAULT 'JPY',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (worker_id) REFERENCES workers(id) ON DELETE CASCADE
      )`
    );
    await root.query(`CREATE INDEX idx_fee_payments_worker ON fee_payments(worker_id)`);
    await root.query(`CREATE INDEX idx_fee_payments_type ON fee_payments(fee_type)`);
  } catch (err: any) {
    if (err?.code !== 'ER_DUP_KEYNAME' && err?.errno !== 1061) {
      console.warn('fee_payments migrate skipped:', err?.code || err?.message);
    }
  }

  try {
    await root.query(
      `CREATE TABLE IF NOT EXISTS invoice_payments (
        id VARCHAR(64) PRIMARY KEY,
        invoice_id VARCHAR(64) NOT NULL,
        amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        payment_date DATE NOT NULL,
        receipt_no VARCHAR(50) NULL,
        notes TEXT NULL,
        currency ENUM('JPY', 'MMK', 'USD') NOT NULL DEFAULT 'JPY',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
      )`
    );
    await root.query(`CREATE INDEX idx_invoice_payments_invoice ON invoice_payments(invoice_id)`);
  } catch (err: any) {
    if (err?.code !== 'ER_DUP_KEYNAME' && err?.errno !== 1061) {
      console.warn('invoice_payments migrate skipped:', err?.code || err?.message);
    }
  }

  try {
    await root.query(
      `CREATE TABLE IF NOT EXISTS students (
        id VARCHAR(64) PRIMARY KEY,
        serial_no VARCHAR(20) NOT NULL UNIQUE,
        name VARCHAR(100) NOT NULL,
        gender ENUM('Male', 'Female') NOT NULL,
        dob DATE NOT NULL,
        passport_no VARCHAR(30) NOT NULL,
        status ENUM('Active', 'Contract Ended', 'Absconded') NOT NULL DEFAULT 'Active',
        absconded_date DATE NULL,
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
      )`
    );
    await root.query(
      `CREATE TABLE IF NOT EXISTS student_deployments (
        id VARCHAR(64) PRIMARY KEY,
        student_id VARCHAR(64) NOT NULL,
        visa_type VARCHAR(50) NOT NULL,
        supervising_org VARCHAR(150) NOT NULL,
        host_company VARCHAR(150) NOT NULL,
        job_category VARCHAR(100) NOT NULL,
        own_card_date DATE NULL,
        departure_date DATE NULL,
        japan_entry_date DATE NULL,
        contract_end_date DATE NULL,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        UNIQUE KEY uq_student_deployments_student (student_id)
      )`
    );
    await root.query(
      `CREATE TABLE IF NOT EXISTS student_financial_configs (
        id VARCHAR(64) PRIMARY KEY,
        student_id VARCHAR(64) NOT NULL,
        introduction_fee DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE CASCADE,
        UNIQUE KEY uq_student_financial (student_id)
      )`
    );
    await root.query(
      `CREATE TABLE IF NOT EXISTS student_invoices (
        id VARCHAR(64) PRIMARY KEY,
        invoice_no VARCHAR(30) NOT NULL UNIQUE,
        student_id VARCHAR(64) NULL,
        school_name VARCHAR(150) NULL,
        fee_type ENUM('introduction') NOT NULL DEFAULT 'introduction',
        billing_period VARCHAR(50) NOT NULL,
        last_invoice_date DATE NOT NULL,
        next_invoice_date DATE NOT NULL,
        total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        amount_received DECIMAL(12,2) DEFAULT 0.00,
        outstanding_amount DECIMAL(12,2) DEFAULT 0.00,
        payment_received_date DATE NULL,
        receipt_no VARCHAR(50) NULL,
        receipt_sent_date DATE NULL,
        status ENUM('Pending', 'Partial', 'Paid', 'Overdue') NOT NULL DEFAULT 'Pending',
        currency ENUM('JPY', 'MMK', 'USD') NOT NULL DEFAULT 'JPY',
        notes TEXT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (student_id) REFERENCES students(id) ON DELETE SET NULL
      )`
    );
    await root.query(
      `CREATE TABLE IF NOT EXISTS student_invoice_lines (
        id VARCHAR(64) PRIMARY KEY,
        invoice_id VARCHAR(64) NOT NULL,
        student_id VARCHAR(64) NOT NULL,
        amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        UNIQUE KEY uq_student_invoice_line (invoice_id, student_id),
        KEY idx_student_invoice_lines_invoice (invoice_id),
        KEY idx_student_invoice_lines_student (student_id)
      )`
    );
    await root.query(
      `CREATE TABLE IF NOT EXISTS student_invoice_payments (
        id VARCHAR(64) PRIMARY KEY,
        invoice_id VARCHAR(64) NOT NULL,
        amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
        payment_date DATE NOT NULL,
        receipt_no VARCHAR(50) NULL,
        notes TEXT NULL,
        currency ENUM('JPY', 'MMK', 'USD') NOT NULL DEFAULT 'JPY',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (invoice_id) REFERENCES student_invoices(id) ON DELETE CASCADE
      )`
    );
  } catch (err: any) {
    if (err?.code !== 'ER_DUP_KEYNAME' && err?.errno !== 1061) {
      console.warn('student tables migrate skipped:', err?.code || err?.message);
    }
  }
  for (const stmt of [
    'CREATE INDEX idx_students_status ON students(status)',
    'CREATE INDEX idx_student_deployments_contract ON student_deployments(contract_end_date)',
    'CREATE INDEX idx_student_invoices_student ON student_invoices(student_id)',
    'CREATE INDEX idx_student_invoices_school ON student_invoices(school_name)',
    'CREATE INDEX idx_student_invoices_next_date ON student_invoices(next_invoice_date)',
    'CREATE INDEX idx_student_invoices_status ON student_invoices(status)',
    'CREATE INDEX idx_student_invoice_payments_invoice ON student_invoice_payments(invoice_id)',
    'CREATE INDEX idx_student_invoice_lines_invoice ON student_invoice_lines(invoice_id)',
  ]) {
    try {
      await root.query(stmt);
    } catch (err: any) {
      if (err?.code !== 'ER_DUP_KEYNAME' && err?.errno !== 1061) {
        console.warn('student index migrate skipped:', stmt, err?.code || err?.message);
      }
    }
  }

  // Widen id columns so prefixed IDs fit safely
  for (const stmt of [
    'ALTER TABLE workers MODIFY id VARCHAR(64) NOT NULL',
    'ALTER TABLE deployments MODIFY id VARCHAR(64) NOT NULL',
    'ALTER TABLE deployments MODIFY worker_id VARCHAR(64) NOT NULL',
    'ALTER TABLE financial_configs MODIFY id VARCHAR(64) NOT NULL',
    'ALTER TABLE financial_configs MODIFY worker_id VARCHAR(64) NOT NULL',
    'ALTER TABLE invoices MODIFY id VARCHAR(64) NOT NULL',
    'ALTER TABLE invoices MODIFY worker_id VARCHAR(64) NOT NULL',
  ]) {
    try {
      await root.query(stmt);
    } catch (err: any) {
      // Ignore if FK temporarily blocks; new installs already use VARCHAR(64)
      if (err?.code === 'ER_FK_COLUMN_CANNOT_CHANGE' || err?.errno === 1833) continue;
      console.warn('Column widen skipped:', stmt, err?.code || err?.message);
    }
  }

  const [workerCountRows] = await root.query<any[]>('SELECT COUNT(*) AS c FROM workers');
  if (Number(workerCountRows[0].c) === 0) {
    console.log('Seeding sample workers & invoices…');
    await seed(root);
  } else {
    const [invCount] = await root.query<any[]>('SELECT COUNT(*) AS c FROM invoices');
    if (Number(invCount[0].c) === 0) {
      console.log('Workers present; seeding invoices only…');
      await seedInvoices(root);
    } else {
      console.log('Tables ready; seed skipped (data already present).');
    }
    try {
      const [fpCount] = await root.query<any[]>('SELECT COUNT(*) AS c FROM fee_payments');
      if (Number(fpCount[0].c) === 0) {
        console.log('Seeding sample fee payments…');
        await seedFeePayments(root);
      }
    } catch (err: any) {
      console.warn('fee_payments seed skipped:', err?.code || err?.message);
    }
  }

  const [studentCountRows] = await root.query<any[]>('SELECT COUNT(*) AS c FROM students');
  if (Number(studentCountRows[0].c) === 0) {
    console.log('Seeding sample students…');
    await seedStudents(root);
  } else {
    console.log('Students table ready; student seed skipped.');
  }

  const [userCountRows] = await root.query<any[]>('SELECT COUNT(*) AS c FROM users');
  if (Number(userCountRows[0].c) === 0) {
    console.log('Seeding login users…');
    await seedUsers(root);
  } else {
    console.log('Users table ready; user seed skipped.');
  }

  await backfillUserPermissions(root);

  await seedPrintAndVariables(root);

  await root.end();
  console.log(`Database ${DB_NAME} initialized at ${DB_HOST}:${DB_PORT}`);
}

async function seedPrintAndVariables(conn: mysql.Connection) {
  const [printRows] = await conn.query<any[]>('SELECT COUNT(*) AS c FROM print_settings');
  if (Number(printRows[0].c) === 0) {
    console.log('Seeding print settings…');
    await conn.execute(
      `INSERT INTO print_settings (id, agency_name, address, phone, logo_data)
       VALUES (1, ?, ?, ?, NULL)`,
      [
        'Golden Horizon Overseas Employment Agency',
        'No. 124, Pyay Road, Mayangone Township, Yangon, Myanmar',
        '+95 1 234567',
      ]
    );
  }

  const [varRows] = await conn.query<any[]>('SELECT COUNT(*) AS c FROM system_variables');
  if (Number(varRows[0].c) === 0) {
    console.log('Seeding system variables…');
    const vars: Array<[string, string, string, number]> = [
      ['var-visa-1', 'visa_type', 'TITP-1', 1],
      ['var-visa-2', 'visa_type', 'TITP-2', 2],
      ['var-visa-3', 'visa_type', 'TITP-3', 3],
      ['var-visa-4', 'visa_type', 'SSW-Caregiver', 4],
      ['var-visa-5', 'visa_type', 'SSW-Construction', 5],
      ['var-visa-6', 'visa_type', 'SSW-Food Processing', 6],
      ['var-visa-7', 'visa_type', 'SSW-Agriculture', 7],
      ['var-visa-8', 'visa_type', 'SSW-Manufacturing', 8],
      ['var-visa-9', 'visa_type', 'Engineering/Humanities', 9],
      ['var-org-1', 'supervising_org', 'Japan Skill Cooperative (JSC)', 1],
      ['var-org-2', 'supervising_org', 'Kanto Caregiver Support Org', 2],
      ['var-org-3', 'supervising_org', 'OTIT International Union', 3],
      ['var-org-4', 'supervising_org', 'Chubu Textile Association', 4],
      ['var-host-1', 'host_company', 'Tanaka Precision Machinery Co., Ltd.', 1],
      ['var-host-2', 'host_company', 'Fuji Elderly Care Center Osaka', 2],
      ['var-host-3', 'host_company', 'Yamada Construction Group', 3],
      ['var-host-4', 'host_company', 'Nagoya Garment & Apparel Ltd.', 4],
      ['var-host-5', 'host_company', 'Saitama Bento & Delica Inc.', 5],
      ['var-host-6', 'host_company', 'Kyoto Auto Parts Co., Ltd.', 6],
      ['var-host-7', 'host_company', 'Hokkaido Dairy Farm Association', 7],
      ['var-host-8', 'host_company', 'Yokohama Logistics Hub K.K.', 8],
      ['var-job-1', 'job_category', 'Machining & Metal Works', 1],
      ['var-job-2', 'job_category', 'Caregiver / Nursing Care', 2],
      ['var-job-3', 'job_category', 'Scaffolding & Building Works', 3],
      ['var-job-4', 'job_category', 'Textile Manufacturing', 4],
      ['var-job-5', 'job_category', 'Food & Beverage Production', 5],
      ['var-school-1', 'school_name', 'Tokyo Japanese Language Academy', 1],
      ['var-school-2', 'school_name', 'Osaka International College', 2],
      ['var-school-3', 'school_name', 'Nagoya Career School', 3],
      ['var-school-4', 'school_name', 'Fukuoka Study Abroad Center', 4],
    ];

    const hostParent: Record<string, string> = {
      'Tanaka Precision Machinery Co., Ltd.': 'Japan Skill Cooperative (JSC)',
      'Fuji Elderly Care Center Osaka': 'Kanto Caregiver Support Org',
      'Yamada Construction Group': 'OTIT International Union',
      'Nagoya Garment & Apparel Ltd.': 'Chubu Textile Association',
      'Saitama Bento & Delica Inc.': 'Japan Skill Cooperative (JSC)',
      'Kyoto Auto Parts Co., Ltd.': 'Japan Skill Cooperative (JSC)',
      'Hokkaido Dairy Farm Association': 'OTIT International Union',
      'Yokohama Logistics Hub K.K.': 'Japan Skill Cooperative (JSC)',
    };

    for (const [id, category, value, sortOrder] of vars) {
      const parentValue =
        category === 'host_company' ? hostParent[value] || null : null;
      await conn.execute(
        `INSERT INTO system_variables (id, category, value, parent_value, sort_order, is_active)
         VALUES (?, ?, ?, ?, ?, 1)`,
        [id, category, value, parentValue, sortOrder]
      );
    }
  } else {
    console.log('System variables ready; seed skipped.');
  }

  // Existing DBs may already have variables but no host_company / school_name yet
  const [hostRows] = await conn.query<any[]>(
    `SELECT COUNT(*) AS c FROM system_variables WHERE category = 'host_company'`
  );
  if (Number(hostRows[0].c) === 0) {
    console.log('Seeding host_company variables…');
    const hosts: Array<[string, string, number, string]> = [
      ['var-host-1', 'Tanaka Precision Machinery Co., Ltd.', 1, 'Japan Skill Cooperative (JSC)'],
      ['var-host-2', 'Fuji Elderly Care Center Osaka', 2, 'Kanto Caregiver Support Org'],
      ['var-host-3', 'Yamada Construction Group', 3, 'OTIT International Union'],
      ['var-host-4', 'Nagoya Garment & Apparel Ltd.', 4, 'Chubu Textile Association'],
      ['var-host-5', 'Saitama Bento & Delica Inc.', 5, 'Japan Skill Cooperative (JSC)'],
      ['var-host-6', 'Kyoto Auto Parts Co., Ltd.', 6, 'Japan Skill Cooperative (JSC)'],
      ['var-host-7', 'Hokkaido Dairy Farm Association', 7, 'OTIT International Union'],
      ['var-host-8', 'Yokohama Logistics Hub K.K.', 8, 'Japan Skill Cooperative (JSC)'],
    ];
    for (const [id, value, sortOrder, parentValue] of hosts) {
      try {
        await conn.execute(
          `INSERT INTO system_variables (id, category, value, parent_value, sort_order, is_active)
           VALUES (?, 'host_company', ?, ?, ?, 1)`,
          [id, value, parentValue, sortOrder]
        );
      } catch (err: any) {
        if (err?.code !== 'ER_DUP_ENTRY' && err?.errno !== 1062) throw err;
      }
    }
  } else {
    // Backfill parent_value for hosts that were seeded without an org link
    const hostParentBackfill: Array<[string, string]> = [
      ['Tanaka Precision Machinery Co., Ltd.', 'Japan Skill Cooperative (JSC)'],
      ['Fuji Elderly Care Center Osaka', 'Kanto Caregiver Support Org'],
      ['Yamada Construction Group', 'OTIT International Union'],
      ['Nagoya Garment & Apparel Ltd.', 'Chubu Textile Association'],
      ['Saitama Bento & Delica Inc.', 'Japan Skill Cooperative (JSC)'],
      ['Kyoto Auto Parts Co., Ltd.', 'Japan Skill Cooperative (JSC)'],
      ['Hokkaido Dairy Farm Association', 'OTIT International Union'],
      ['Yokohama Logistics Hub K.K.', 'Japan Skill Cooperative (JSC)'],
    ];
    for (const [host, org] of hostParentBackfill) {
      await conn.execute(
        `UPDATE system_variables
         SET parent_value = ?
         WHERE category = 'host_company' AND value = ?
           AND (parent_value IS NULL OR parent_value = '')`,
        [org, host]
      );
    }
  }

  // Existing DBs may already have variables but no school_name yet
  const [schoolRows] = await conn.query<any[]>(
    `SELECT COUNT(*) AS c FROM system_variables WHERE category = 'school_name'`
  );
  if (Number(schoolRows[0].c) === 0) {
    console.log('Seeding school_name variables…');
    const schools: Array<[string, string, number]> = [
      ['var-school-1', 'Tokyo Japanese Language Academy', 1],
      ['var-school-2', 'Osaka International College', 2],
      ['var-school-3', 'Nagoya Career School', 3],
      ['var-school-4', 'Fukuoka Study Abroad Center', 4],
    ];
    for (const [id, value, sortOrder] of schools) {
      try {
        await conn.execute(
          `INSERT INTO system_variables (id, category, value, sort_order, is_active)
           VALUES (?, 'school_name', ?, ?, 1)`,
          [id, value, sortOrder]
        );
      } catch (err: any) {
        if (err?.code !== 'ER_DUP_ENTRY' && err?.errno !== 1062) throw err;
      }
    }
  }
}

async function seedUsers(conn: mysql.Connection) {
  // Passwords stored and compared as plain text (no hash/encode).
  const { defaultPermissionsForRole } = await import('../utils/permissions.js');

  const users = [
    {
      id: 'usr-admin-1',
      name: 'U Aung Kyaw',
      email: 'admin@agencyos.com.mm',
      password: 'admin123',
      role: 'Admin' as const,
      title: 'Managing Director / System Admin',
    },
    {
      id: 'usr-mgr-1',
      name: 'Daw Hnin Nu',
      email: 'manager@agencyos.com.mm',
      password: 'manager123',
      role: 'Manager' as const,
      title: 'Operations & Billing Manager',
    },
    {
      id: 'usr-staff-1',
      name: 'Ko Min Thant',
      email: 'staff@agencyos.com.mm',
      password: 'staff123',
      role: 'Staff' as const,
      title: 'Data Entry & Visa Officer',
    },
  ];

  for (const u of users) {
    const permissions = JSON.stringify(defaultPermissionsForRole(u.role));
    await conn.execute(
      `INSERT INTO users (id, name, email, password, role, title, is_active, permissions)
       VALUES (?, ?, ?, ?, ?, ?, 1, ?)`,
      [u.id, u.name, u.email, u.password, u.role, u.title, permissions]
    );
  }
}

async function backfillUserPermissions(conn: mysql.Connection) {
  const { defaultPermissionsForRole } = await import('../utils/permissions.js');
  const [rows] = await conn.query<any[]>(
    `SELECT id, role FROM users WHERE permissions IS NULL`
  );
  for (const row of rows) {
    await conn.execute(`UPDATE users SET permissions = ? WHERE id = ?`, [
      JSON.stringify(defaultPermissionsForRole(row.role)),
      row.id,
    ]);
  }
  if (rows.length) {
    console.log(`Backfilled permissions for ${rows.length} user(s).`);
  }
}

async function seed(conn: mysql.Connection) {
  const workers = [
    {
      id: 'w-101',
      serialNo: 'W-2024-001',
      name: 'Kyaw Kyaw',
      gender: 'Male',
      dob: '1998-05-14',
      passportNo: 'MD123456',
      status: 'Active',
      notes: 'Good performance at Tokyo Precision Factory. Punctual.',
      dep: {
        id: 'dep-101',
        visaType: 'SSW-Manufacturing',
        supervisingOrg: 'Japan Skill Cooperative (JSC)',
        hostCompany: 'Tanaka Precision Machinery Co., Ltd.',
        jobCategory: 'Machining & Metal Works',
        ownCardDate: '2024-01-15',
        departureDate: '2024-03-01',
        japanEntryDate: '2024-03-02',
        contractEndDate: '2027-03-01',
      },
      fin: {
        id: 'fin-101',
        flightFee: 150000,
        trainingFee: 250000,
        managementFee: 30000,
        billingCycleMonths: 6,
      },
    },
    {
      id: 'w-102',
      serialNo: 'W-2024-002',
      name: 'Su Su Hlaing',
      gender: 'Female',
      dob: '1999-11-20',
      passportNo: 'MD234567',
      status: 'Active',
      notes: 'Working as Caregiver in Osaka Nursing Home.',
      dep: {
        id: 'dep-102',
        visaType: 'SSW-Caregiver',
        supervisingOrg: 'Kanto Caregiver Support Org',
        hostCompany: 'Fuji Elderly Care Center Osaka',
        jobCategory: 'Caregiver / Nursing Care',
        ownCardDate: '2024-02-01',
        departureDate: '2024-04-10',
        japanEntryDate: '2024-04-11',
        contractEndDate: '2026-08-15',
      },
      fin: {
        id: 'fin-102',
        flightFee: 160000,
        trainingFee: 280000,
        managementFee: 35000,
        billingCycleMonths: 6,
      },
    },
    {
      id: 'w-103',
      serialNo: 'W-2024-003',
      name: 'Aung Zaw Oo',
      gender: 'Male',
      dob: '1995-08-08',
      passportNo: 'MD345678',
      status: 'Contract Ended',
      notes: 'Completed 3-year TITP contract successfully. Returned to Myanmar.',
      dep: {
        id: 'dep-103',
        visaType: 'TITP-2',
        supervisingOrg: 'OTIT International Union',
        hostCompany: 'Yamada Construction Group',
        jobCategory: 'Scaffolding & Building Works',
        ownCardDate: '2021-05-10',
        departureDate: '2021-07-01',
        japanEntryDate: '2021-07-02',
        contractEndDate: '2024-07-01',
      },
      fin: {
        id: 'fin-103',
        flightFee: 140000,
        trainingFee: 220000,
        managementFee: 25000,
        billingCycleMonths: 6,
      },
    },
    {
      id: 'w-104',
      serialNo: 'W-2024-004',
      name: 'Thae Thae Swe',
      gender: 'Female',
      dob: '2001-03-12',
      passportNo: 'MD456789',
      status: 'Absconded',
      abscondedDate: '2025-01-15',
      notes: 'Reported missing from dorm on 2025-01-15.',
      dep: {
        id: 'dep-104',
        visaType: 'TITP-1',
        supervisingOrg: 'Chubu Textile Association',
        hostCompany: 'Nagoya Garment & Apparel Ltd.',
        jobCategory: 'Textile Manufacturing',
        ownCardDate: '2024-06-01',
        departureDate: '2024-08-01',
        japanEntryDate: '2024-08-02',
        contractEndDate: '2025-08-01',
      },
      fin: {
        id: 'fin-104',
        flightFee: 150000,
        trainingFee: 200000,
        managementFee: 30000,
        billingCycleMonths: 6,
      },
    },
    {
      id: 'w-105',
      serialNo: 'W-2024-005',
      name: 'Min Thu Aung',
      gender: 'Male',
      dob: '1997-09-25',
      passportNo: 'MD567890',
      status: 'Active',
      notes: 'SSW Food Processing worker in Saitama.',
      dep: {
        id: 'dep-105',
        visaType: 'SSW-Food Processing',
        supervisingOrg: 'Japan Skill Cooperative (JSC)',
        hostCompany: 'Saitama Bento & Delica Inc.',
        jobCategory: 'Food & Beverage Production',
        ownCardDate: '2024-09-01',
        departureDate: '2024-11-01',
        japanEntryDate: '2024-11-02',
        contractEndDate: '2027-11-01',
      },
      fin: {
        id: 'fin-105',
        flightFee: 150000,
        trainingFee: 260000,
        managementFee: 30000,
        billingCycleMonths: 6,
      },
    },
  ];

  for (const w of workers) {
    await conn.execute(
      `INSERT INTO workers (id, serial_no, name, gender, dob, passport_no, status, absconded_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        w.id,
        w.serialNo,
        w.name,
        w.gender,
        w.dob,
        w.passportNo,
        w.status,
        (w as { abscondedDate?: string }).abscondedDate || null,
        w.notes,
      ]
    );
    await conn.execute(
      `INSERT INTO deployments
        (id, worker_id, visa_type, supervising_org, host_company, job_category,
         own_card_date, departure_date, japan_entry_date, contract_end_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        w.dep.id,
        w.id,
        w.dep.visaType,
        w.dep.supervisingOrg,
        w.dep.hostCompany,
        w.dep.jobCategory,
        w.dep.ownCardDate,
        w.dep.departureDate,
        w.dep.japanEntryDate,
        w.dep.contractEndDate,
      ]
    );
    await conn.execute(
      `INSERT INTO financial_configs
        (id, worker_id, flight_fee, training_fee, management_fee, billing_cycle_months)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        w.fin.id,
        w.id,
        w.fin.flightFee,
        w.fin.trainingFee,
        w.fin.managementFee,
        w.fin.billingCycleMonths,
      ]
    );
  }

  await seedInvoices(conn);
  await seedFeePayments(conn);
}

async function seedFeePayments(conn: mysql.Connection) {
  const [workers] = await conn.query<any[]>(
    `SELECT w.id, f.flight_fee, f.training_fee
     FROM workers w
     LEFT JOIN financial_configs f ON f.worker_id = w.id
     ORDER BY w.serial_no ASC
     LIMIT 3`
  );
  if (!workers.length) return;

  const payments: Array<{
    id: string;
    workerId: string;
    feeType: string;
    amount: number;
    paymentDate: string;
    receiptNo: string;
    notes: string;
  }> = [];

  const w0 = workers[0];
  const flight0 = Number(w0.flight_fee) || 0;
  const training0 = Number(w0.training_fee) || 0;
  if (flight0 > 0) {
    payments.push({
      id: 'fp-001',
      workerId: w0.id,
      feeType: 'flight',
      amount: flight0,
      paymentDate: '2024-02-10',
      receiptNo: 'FF-2024-001',
      notes: 'Flight fee paid in full',
    });
  }
  if (training0 > 0) {
    const first = Math.round(training0 * 0.4);
    const second = Math.round(training0 * 0.3);
    payments.push({
      id: 'fp-002',
      workerId: w0.id,
      feeType: 'training',
      amount: first,
      paymentDate: '2024-02-15',
      receiptNo: 'TF-2024-001',
      notes: 'Training fee first installment',
    });
    payments.push({
      id: 'fp-003',
      workerId: w0.id,
      feeType: 'training',
      amount: second,
      paymentDate: '2024-03-20',
      receiptNo: 'TF-2024-002',
      notes: 'Training fee second installment',
    });
  }

  if (workers[1]) {
    const flight1 = Number(workers[1].flight_fee) || 0;
    if (flight1 > 0) {
      payments.push({
        id: 'fp-004',
        workerId: workers[1].id,
        feeType: 'flight',
        amount: Math.round(flight1 / 2),
        paymentDate: '2024-03-01',
        receiptNo: 'FF-2024-010',
        notes: 'Flight fee installment 1/2',
      });
    }
  }

  for (const p of payments) {
    await conn.execute(
      `INSERT INTO fee_payments
        (id, worker_id, fee_type, amount, payment_date, receipt_no, notes, currency)
       VALUES (?, ?, ?, ?, ?, ?, ?, 'JPY')`,
      [p.id, p.workerId, p.feeType, p.amount, p.paymentDate, p.receiptNo, p.notes]
    );
  }
}

async function seedStudents(conn: mysql.Connection) {
  const students = [
    {
      id: 's-201',
      serialNo: 'S-2026-001',
      name: 'Hla Hla Win',
      gender: 'Female',
      dob: '2002-04-18',
      passportNo: 'ST123456',
      status: 'Active',
      notes: 'Tokyo school — introduction fee test student.',
      dep: {
        id: 'sdep-201',
        visaType: 'TITP-1',
        supervisingOrg: 'Tokyo Japanese Language Academy',
        hostCompany: '1-2-3 Shinjuku, Tokyo',
      },
      fin: { id: 'sfin-201', introductionFee: 220000 },
    },
    {
      id: 's-202',
      serialNo: 'S-2026-002',
      name: 'Ko Ko Lwin',
      gender: 'Male',
      dob: '2001-12-09',
      passportNo: 'ST234567',
      status: 'Active',
      notes: 'Osaka school — introduction fee test student.',
      dep: {
        id: 'sdep-202',
        visaType: 'SSW-Food Processing',
        supervisingOrg: 'Osaka International College',
        hostCompany: '4-5-6 Namba, Osaka',
      },
      fin: { id: 'sfin-202', introductionFee: 250000 },
    },
    {
      id: 's-203',
      serialNo: 'S-2026-003',
      name: 'Aye Aye Myint',
      gender: 'Female',
      dob: '2003-07-22',
      passportNo: 'ST345678',
      status: 'Active',
      notes: 'Tokyo school — second student for school invoice lines.',
      dep: {
        id: 'sdep-203',
        visaType: 'TITP-1',
        supervisingOrg: 'Tokyo Japanese Language Academy',
        hostCompany: '1-2-3 Shinjuku, Tokyo',
      },
      fin: { id: 'sfin-203', introductionFee: 220000 },
    },
    {
      id: 's-204',
      serialNo: 'S-2026-004',
      name: 'Zaw Min Oo',
      gender: 'Male',
      dob: '2000-01-30',
      passportNo: 'ST456789',
      status: 'Active',
      notes: 'Tokyo school — third student.',
      dep: {
        id: 'sdep-204',
        visaType: 'SSW-Manufacturing',
        supervisingOrg: 'Tokyo Japanese Language Academy',
        hostCompany: '1-2-3 Shinjuku, Tokyo',
      },
      fin: { id: 'sfin-204', introductionFee: 230000 },
    },
    {
      id: 's-205',
      serialNo: 'S-2026-005',
      name: 'May Thu',
      gender: 'Female',
      dob: '2002-09-05',
      passportNo: 'ST567890',
      status: 'Active',
      notes: 'Osaka school — second student.',
      dep: {
        id: 'sdep-205',
        visaType: 'SSW-Caregiver',
        supervisingOrg: 'Osaka International College',
        hostCompany: '4-5-6 Namba, Osaka',
      },
      fin: { id: 'sfin-205', introductionFee: 240000 },
    },
    {
      id: 's-206',
      serialNo: 'S-2026-006',
      name: 'Nay Lin',
      gender: 'Male',
      dob: '2001-06-14',
      passportNo: 'ST678901',
      status: 'Active',
      notes: 'Nagoya school — paid invoice test.',
      dep: {
        id: 'sdep-206',
        visaType: 'TITP-2',
        supervisingOrg: 'Nagoya Career School',
        hostCompany: '7-8-9 Sakae, Nagoya',
      },
      fin: { id: 'sfin-206', introductionFee: 210000 },
    },
    {
      id: 's-207',
      serialNo: 'S-2026-007',
      name: 'Su Myat',
      gender: 'Female',
      dob: '2003-11-11',
      passportNo: 'ST789012',
      status: 'Active',
      notes: 'Nagoya school — second student.',
      dep: {
        id: 'sdep-207',
        visaType: 'TITP-1',
        supervisingOrg: 'Nagoya Career School',
        hostCompany: '7-8-9 Sakae, Nagoya',
      },
      fin: { id: 'sfin-207', introductionFee: 210000 },
    },
    {
      id: 's-208',
      serialNo: 'S-2026-008',
      name: 'Phone Myat',
      gender: 'Male',
      dob: '2002-02-28',
      passportNo: 'ST890123',
      status: 'Active',
      notes: 'Fukuoka school — pending invoice test.',
      dep: {
        id: 'sdep-208',
        visaType: 'Engineering/Humanities',
        supervisingOrg: 'Fukuoka Study Abroad Center',
        hostCompany: '2-1 Tenjin, Fukuoka',
      },
      fin: { id: 'sfin-208', introductionFee: 260000 },
    },
  ];

  for (const s of students) {
    await conn.execute(
      `INSERT INTO students (id, serial_no, name, gender, dob, passport_no, status, absconded_date, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?, NULL, ?)`,
      [s.id, s.serialNo, s.name, s.gender, s.dob, s.passportNo, s.status, s.notes]
    );
    await conn.execute(
      `INSERT INTO student_deployments
        (id, student_id, visa_type, supervising_org, host_company, job_category,
         own_card_date, departure_date, japan_entry_date, contract_end_date)
       VALUES (?, ?, ?, ?, ?, '', NULL, NULL, NULL, NULL)`,
      [s.dep.id, s.id, s.dep.visaType, s.dep.supervisingOrg, s.dep.hostCompany]
    );
    await conn.execute(
      `INSERT INTO student_financial_configs
        (id, student_id, introduction_fee)
       VALUES (?, ?, ?)`,
      [s.fin.id, s.id, s.fin.introductionFee]
    );
  }

  console.log('Student profiles seeded. Run npm run seed:test-fees for school/host fee invoices.');
}

async function seedInvoices(conn: mysql.Connection) {
  const invoices = [
    {
      id: 'inv-201',
      invoiceNo: 'INV-2026-001',
      workerId: 'w-101',
      billingPeriod: '2026 H1 (Jan-Jun 2026)',
      lastInvoiceDate: '2026-01-15',
      nextInvoiceDate: '2026-07-25',
      totalAmount: 180000,
      amountReceived: 100000,
      outstandingAmount: 80000,
      paymentReceivedDate: '2026-02-10',
      receiptNo: 'REC-2026-045',
      receiptSentDate: '2026-02-12',
      status: 'Partial',
      notes: 'Partial payment of 100,000 JPY received.',
    },
    {
      id: 'inv-202',
      invoiceNo: 'INV-2026-002',
      workerId: 'w-102',
      billingPeriod: '2026 H1 (Jan-Jun 2026)',
      lastInvoiceDate: '2026-01-20',
      nextInvoiceDate: '2026-07-28',
      totalAmount: 210000,
      amountReceived: 0,
      outstandingAmount: 210000,
      paymentReceivedDate: null as string | null,
      receiptNo: null as string | null,
      receiptSentDate: null as string | null,
      status: 'Pending',
      notes: 'Semi-annual management fee invoice.',
    },
    {
      id: 'inv-203',
      invoiceNo: 'INV-2026-003',
      workerId: 'w-105',
      billingPeriod: '2026 H1 (Jan-Jun 2026)',
      lastInvoiceDate: '2026-01-10',
      nextInvoiceDate: '2026-07-10',
      totalAmount: 180000,
      amountReceived: 180000,
      outstandingAmount: 0,
      paymentReceivedDate: '2026-06-30',
      receiptNo: 'REC-2026-088',
      receiptSentDate: null as string | null,
      status: 'Paid',
      notes: 'Paid in full. Pending receipt dispatch.',
    },
  ];

  for (const inv of invoices) {
    await conn.execute(
      `INSERT INTO invoices
        (id, invoice_no, worker_id, fee_type, billing_period, last_invoice_date, next_invoice_date,
         total_amount, amount_received, outstanding_amount, payment_received_date,
         receipt_no, receipt_sent_date, status, currency, notes)
       VALUES (?, ?, ?, 'management', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'JPY', ?)`,
      [
        inv.id,
        inv.invoiceNo,
        inv.workerId,
        inv.billingPeriod,
        inv.lastInvoiceDate,
        inv.nextInvoiceDate,
        inv.totalAmount,
        inv.amountReceived,
        inv.outstandingAmount,
        inv.paymentReceivedDate,
        inv.receiptNo,
        inv.receiptSentDate,
        inv.status,
        inv.notes,
      ]
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
