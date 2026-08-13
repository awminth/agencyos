import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { randomUUID } from 'crypto';
import { pool } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';

export type VariableCategory =
  | 'visa_type'
  | 'supervising_org'
  | 'host_company'
  | 'job_category'
  | 'school_name';

export interface PrintSettings {
  agencyName: string;
  address: string;
  phone: string;
  registrationNo: string;
  fax: string;
  logoData: string | null;
}

export type PrintVoucherSlot = 1 | 2;

export interface BothPrintSettings {
  voucher1: PrintSettings;
  voucher2: PrintSettings;
}

export interface BankAccount {
  id: string;
  label: string;
  bankName: string;
  branchCode: string;
  branchName: string;
  accountNumber: string;
  accountHolder: string;
  isDefault: boolean;
  sortOrder: number;
  isActive: boolean;
}

export type DisplayCurrency = 'JPY' | 'MMK';

export interface CurrencySettings {
  /** How many MMK equal 1 JPY */
  jpyToMmkRate: number;
  displayCurrency: DisplayCurrency;
}

export interface SystemVariable {
  id: string;
  category: VariableCategory;
  value: string;
  /** For host_company: linked supervising_org value */
  parentValue?: string | null;
  sortOrder: number;
  isActive: boolean;
}

interface PrintRow extends RowDataPacket {
  id?: number;
  agency_name: string;
  address: string | null;
  phone: string | null;
  registration_no?: string | null;
  fax?: string | null;
  logo_data: string | null;
}

interface BankAccountRow extends RowDataPacket {
  id: string;
  label: string;
  bank_name: string;
  branch_code: string | null;
  branch_name: string | null;
  account_number: string;
  account_holder: string;
  is_default: number;
  sort_order: number;
  is_active: number;
}

interface CurrencyRow extends RowDataPacket {
  jpy_to_mmk_rate: number | string;
  display_currency: DisplayCurrency;
}

const DEFAULT_CURRENCY: CurrencySettings = {
  jpyToMmkRate: 20,
  displayCurrency: 'JPY',
};

interface VariableRow extends RowDataPacket {
  id: string;
  category: VariableCategory;
  value: string;
  parent_value: string | null;
  sort_order: number;
  is_active: number;
}

const VALID_CATEGORIES: VariableCategory[] = [
  'visa_type',
  'supervising_org',
  'host_company',
  'job_category',
  'school_name',
];

/** Ensure system_variables.category ENUM includes school_name (existing DBs). */
export async function ensureSchoolNameCategory(): Promise<void> {
  await pool
    .execute(
      `ALTER TABLE system_variables
       MODIFY category ENUM(
         'visa_type',
         'supervising_org',
         'host_company',
         'job_category',
         'school_name'
       ) NOT NULL`
    )
    .catch((err: { code?: string; message?: string }) => {
      if (err?.code !== 'ER_NO_SUCH_TABLE') {
        console.warn('ensureSchoolNameCategory skipped:', err?.code || err?.message);
      }
    });
}

/** Ensure host_company can link to a supervising_org via parent_value. */
export async function ensureVariableParentValue(): Promise<void> {
  try {
    await pool.execute(
      `ALTER TABLE system_variables ADD COLUMN parent_value VARCHAR(200) NULL AFTER value`
    );
  } catch (err: any) {
    if (err?.code !== 'ER_DUP_FIELDNAME' && err?.errno !== 1060) {
      // ignore
    }
  }
}

function mapVariable(r: VariableRow): SystemVariable {
  return {
    id: r.id,
    category: r.category,
    value: r.value,
    parentValue: r.parent_value || null,
    sortOrder: r.sort_order,
    isActive: !!r.is_active,
  };
}

function emptyPrint(): PrintSettings {
  return {
    agencyName: '',
    address: '',
    phone: '',
    registrationNo: '',
    fax: '',
    logoData: null,
  };
}

function mapPrintRow(row: PrintRow | undefined): PrintSettings {
  if (!row) return emptyPrint();
  return {
    agencyName: row.agency_name || '',
    address: row.address || '',
    phone: row.phone || '',
    registrationNo: row.registration_no || '',
    fax: row.fax || '',
    logoData: row.logo_data || null,
  };
}

function mapBankAccount(row: BankAccountRow): BankAccount {
  return {
    id: row.id,
    label: row.label || '',
    bankName: row.bank_name || '',
    branchCode: row.branch_code || '',
    branchName: row.branch_name || '',
    accountNumber: row.account_number || '',
    accountHolder: row.account_holder || '',
    isDefault: !!row.is_default,
    sortOrder: Number(row.sort_order) || 0,
    isActive: !!row.is_active,
  };
}

function normalizeSlot(slot: number | undefined): PrintVoucherSlot {
  return slot === 2 ? 2 : 1;
}

/** Ensure print_settings has registration_no / fax columns and voucher slots. */
export async function ensurePrintSettingsSlots(): Promise<void> {
  for (const col of [
    `ALTER TABLE print_settings ADD COLUMN registration_no VARCHAR(80) NULL AFTER phone`,
    `ALTER TABLE print_settings ADD COLUMN fax VARCHAR(50) NULL AFTER registration_no`,
  ]) {
    try {
      await pool.execute(col);
    } catch (err: any) {
      if (err?.code !== 'ER_DUP_FIELDNAME' && err?.errno !== 1060) {
        // ignore
      }
    }
  }

  await pool.execute(
    `INSERT IGNORE INTO print_settings (id, agency_name, address, phone, logo_data)
     VALUES (1, '', NULL, NULL, NULL)`
  );
  const [rows] = await pool.execute<PrintRow[]>(
    `SELECT agency_name, address, phone, registration_no, fax, logo_data FROM print_settings WHERE id = 1 LIMIT 1`
  );
  const src = rows[0];
  await pool.execute(
    `INSERT IGNORE INTO print_settings (id, agency_name, address, phone, registration_no, fax, logo_data)
     VALUES (2, :agencyName, :address, :phone, :registrationNo, :fax, :logoData)`,
    {
      agencyName: src?.agency_name || '',
      address: src?.address || null,
      phone: src?.phone || null,
      registrationNo: src?.registration_no || null,
      fax: src?.fax || null,
      logoData: src?.logo_data || null,
    }
  );
}

export async function ensureBankAccountsTable(): Promise<void> {
  await pool.query(`
    CREATE TABLE IF NOT EXISTS bank_accounts (
      id VARCHAR(64) PRIMARY KEY,
      label VARCHAR(100) NOT NULL DEFAULT '',
      bank_name VARCHAR(150) NOT NULL DEFAULT '',
      branch_code VARCHAR(50) NULL,
      branch_name VARCHAR(150) NULL,
      account_number VARCHAR(50) NOT NULL DEFAULT '',
      account_holder VARCHAR(150) NOT NULL DEFAULT '',
      is_default TINYINT(1) NOT NULL DEFAULT 0,
      sort_order INT NOT NULL DEFAULT 0,
      is_active TINYINT(1) NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    )
  `);
}

export async function getPrintSettings(slot: PrintVoucherSlot = 1): Promise<PrintSettings> {
  await ensurePrintSettingsSlots();
  const [rows] = await pool.execute<PrintRow[]>(
    `SELECT agency_name, address, phone, registration_no, fax, logo_data FROM print_settings WHERE id = :id LIMIT 1`,
    { id: slot }
  );
  return mapPrintRow(rows[0]);
}

export async function getBothPrintSettings(): Promise<BothPrintSettings> {
  await ensurePrintSettingsSlots();
  const [rows] = await pool.execute<PrintRow[]>(
    `SELECT id, agency_name, address, phone, registration_no, fax, logo_data FROM print_settings WHERE id IN (1, 2)`
  );
  const byId = new Map<number, PrintRow>();
  for (const row of rows) {
    byId.set(Number(row.id), row);
  }
  return {
    voucher1: mapPrintRow(byId.get(1)),
    voucher2: mapPrintRow(byId.get(2)),
  };
}

export async function updatePrintSettings(
  input: {
    agencyName?: string;
    address?: string;
    phone?: string;
    registrationNo?: string;
    fax?: string;
    logoData?: string | null;
    slot?: number;
  }
): Promise<BothPrintSettings> {
  const slot = normalizeSlot(input.slot);
  const current = await getPrintSettings(slot);
  const agencyName = (input.agencyName ?? current.agencyName ?? '').trim();
  const address = (input.address ?? current.address ?? '').trim() || null;
  const phone = (input.phone ?? current.phone ?? '').trim() || null;
  const registrationNo =
    (input.registrationNo ?? current.registrationNo ?? '').trim() || null;
  const fax = (input.fax ?? current.fax ?? '').trim() || null;
  const logoData =
    input.logoData !== undefined ? input.logoData : current.logoData;

  await pool.execute(
    `INSERT INTO print_settings (id, agency_name, address, phone, registration_no, fax, logo_data)
     VALUES (:id, :agencyName, :address, :phone, :registrationNo, :fax, :logoData)
     ON DUPLICATE KEY UPDATE
       agency_name = VALUES(agency_name),
       address = VALUES(address),
       phone = VALUES(phone),
       registration_no = VALUES(registration_no),
       fax = VALUES(fax),
       logo_data = VALUES(logo_data)`,
    { id: slot, agencyName, address, phone, registrationNo, fax, logoData }
  );

  return getBothPrintSettings();
}

export async function listBankAccounts(activeOnly = false): Promise<BankAccount[]> {
  await ensureBankAccountsTable();
  let sql = `SELECT id, label, bank_name, branch_code, branch_name, account_number,
                    account_holder, is_default, sort_order, is_active
             FROM bank_accounts`;
  if (activeOnly) sql += ` WHERE is_active = 1`;
  sql += ` ORDER BY is_default DESC, sort_order ASC, bank_name ASC`;
  const [rows] = await pool.execute<BankAccountRow[]>(sql);
  return rows.map(mapBankAccount);
}

export async function getBankAccountById(id: string): Promise<BankAccount> {
  await ensureBankAccountsTable();
  const [rows] = await pool.execute<BankAccountRow[]>(
    `SELECT id, label, bank_name, branch_code, branch_name, account_number,
            account_holder, is_default, sort_order, is_active
     FROM bank_accounts WHERE id = :id LIMIT 1`,
    { id }
  );
  if (!rows[0]) throw new AppError('Bank account not found', 404);
  return mapBankAccount(rows[0]);
}

export async function createBankAccount(input: {
  label?: string;
  bankName?: string;
  branchCode?: string;
  branchName?: string;
  accountNumber?: string;
  accountHolder?: string;
  isDefault?: boolean;
  sortOrder?: number;
}): Promise<BankAccount> {
  await ensureBankAccountsTable();
  const bankName = (input.bankName || '').trim();
  const accountNumber = (input.accountNumber || '').trim();
  const accountHolder = (input.accountHolder || '').trim();
  if (!bankName) throw new AppError('Bank name is required', 400);
  if (!accountNumber) throw new AppError('Account number is required', 400);
  if (!accountHolder) throw new AppError('Account holder is required', 400);

  const id = randomUUID();
  const label =
    (input.label || '').trim() ||
    `${bankName}${input.branchName ? ` / ${input.branchName}` : ''}`;
  const isDefault = input.isDefault ? 1 : 0;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (isDefault) {
      await conn.execute(`UPDATE bank_accounts SET is_default = 0`);
    }
    await conn.execute(
      `INSERT INTO bank_accounts
        (id, label, bank_name, branch_code, branch_name, account_number, account_holder,
         is_default, sort_order, is_active)
       VALUES
        (:id, :label, :bankName, :branchCode, :branchName, :accountNumber, :accountHolder,
         :isDefault, :sortOrder, 1)`,
      {
        id,
        label,
        bankName,
        branchCode: (input.branchCode || '').trim() || null,
        branchName: (input.branchName || '').trim() || null,
        accountNumber,
        accountHolder,
        isDefault,
        sortOrder: Number(input.sortOrder) || 0,
      }
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return getBankAccountById(id);
}

export async function updateBankAccount(
  id: string,
  input: {
    label?: string;
    bankName?: string;
    branchCode?: string;
    branchName?: string;
    accountNumber?: string;
    accountHolder?: string;
    isDefault?: boolean;
    sortOrder?: number;
    isActive?: boolean;
  }
): Promise<BankAccount> {
  const existing = await getBankAccountById(id);
  const bankName = (input.bankName ?? existing.bankName).trim();
  const accountNumber = (input.accountNumber ?? existing.accountNumber).trim();
  const accountHolder = (input.accountHolder ?? existing.accountHolder).trim();
  if (!bankName) throw new AppError('Bank name is required', 400);
  if (!accountNumber) throw new AppError('Account number is required', 400);
  if (!accountHolder) throw new AppError('Account holder is required', 400);

  const label =
    input.label !== undefined
      ? input.label.trim() || bankName
      : existing.label || bankName;
  const isDefault =
    input.isDefault !== undefined ? (input.isDefault ? 1 : 0) : existing.isDefault ? 1 : 0;
  const isActive =
    input.isActive !== undefined ? (input.isActive ? 1 : 0) : existing.isActive ? 1 : 0;

  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    if (isDefault) {
      await conn.execute(`UPDATE bank_accounts SET is_default = 0`);
    }
    await conn.execute(
      `UPDATE bank_accounts SET
         label = :label,
         bank_name = :bankName,
         branch_code = :branchCode,
         branch_name = :branchName,
         account_number = :accountNumber,
         account_holder = :accountHolder,
         is_default = :isDefault,
         sort_order = :sortOrder,
         is_active = :isActive
       WHERE id = :id`,
      {
        id,
        label,
        bankName,
        branchCode:
          input.branchCode !== undefined
            ? input.branchCode.trim() || null
            : existing.branchCode || null,
        branchName:
          input.branchName !== undefined
            ? input.branchName.trim() || null
            : existing.branchName || null,
        accountNumber,
        accountHolder,
        isDefault,
        sortOrder:
          input.sortOrder !== undefined ? Number(input.sortOrder) || 0 : existing.sortOrder,
        isActive,
      }
    );
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }

  return getBankAccountById(id);
}

export async function deleteBankAccount(id: string): Promise<void> {
  await ensureBankAccountsTable();
  const [result] = await pool.execute<ResultSetHeader>(
    `DELETE FROM bank_accounts WHERE id = :id`,
    { id }
  );
  if (result.affectedRows === 0) throw new AppError('Bank account not found', 404);
}

export async function getCurrencySettings(): Promise<CurrencySettings> {
  const [rows] = await pool.execute<CurrencyRow[]>(
    `SELECT jpy_to_mmk_rate, display_currency FROM currency_settings WHERE id = 1 LIMIT 1`
  );
  if (!rows[0]) return { ...DEFAULT_CURRENCY };

  const rate = Number(rows[0].jpy_to_mmk_rate);
  const display = rows[0].display_currency === 'MMK' ? 'MMK' : 'JPY';
  return {
    jpyToMmkRate: Number.isFinite(rate) && rate > 0 ? rate : DEFAULT_CURRENCY.jpyToMmkRate,
    displayCurrency: display,
  };
}

export async function updateCurrencySettings(input: {
  jpyToMmkRate?: number;
  displayCurrency?: string;
}): Promise<CurrencySettings> {
  const current = await getCurrencySettings();
  let jpyToMmkRate = current.jpyToMmkRate;
  if (input.jpyToMmkRate !== undefined) {
    const rate = Number(input.jpyToMmkRate);
    if (!Number.isFinite(rate) || rate <= 0) {
      throw new AppError('Exchange rate must be a positive number (MMK per 1 JPY)', 400);
    }
    jpyToMmkRate = rate;
  }

  let displayCurrency: DisplayCurrency = current.displayCurrency;
  if (input.displayCurrency !== undefined) {
    if (input.displayCurrency !== 'JPY' && input.displayCurrency !== 'MMK') {
      throw new AppError('Display currency must be JPY or MMK', 400);
    }
    displayCurrency = input.displayCurrency;
  }

  await pool.execute(
    `INSERT INTO currency_settings (id, jpy_to_mmk_rate, display_currency)
     VALUES (1, :jpyToMmkRate, :displayCurrency)
     ON DUPLICATE KEY UPDATE
       jpy_to_mmk_rate = VALUES(jpy_to_mmk_rate),
       display_currency = VALUES(display_currency)`,
    { jpyToMmkRate, displayCurrency }
  );

  return getCurrencySettings();
}

export async function listVariables(
  category?: string,
  activeOnly = false
): Promise<SystemVariable[]> {
  await ensureVariableParentValue();
  let sql = `SELECT id, category, value, parent_value, sort_order, is_active FROM system_variables`;
  const params: { category?: string } = {};
  const where: string[] = [];

  if (category && VALID_CATEGORIES.includes(category as VariableCategory)) {
    where.push('category = :category');
    params.category = category;
  }
  if (activeOnly) {
    where.push('is_active = 1');
  }
  if (where.length) sql += ` WHERE ${where.join(' AND ')}`;
  sql += ` ORDER BY category ASC, sort_order ASC, value ASC`;

  const [rows] = await pool.execute<VariableRow[]>(sql, params);
  return rows.map(mapVariable);
}

export async function createVariable(input: {
  category: string;
  value: string;
  parentValue?: string | null;
  sortOrder?: number;
}): Promise<SystemVariable> {
  await ensureVariableParentValue();
  if (!VALID_CATEGORIES.includes(input.category as VariableCategory)) {
    throw new AppError('Invalid variable category', 400);
  }
  const value = input.value.trim();
  if (!value) throw new AppError('Value is required', 400);

  let parentValue: string | null = null;
  if (input.category === 'host_company') {
    parentValue = (input.parentValue || '').trim() || null;
    if (!parentValue) {
      throw new AppError('Host Company အတွက် Supervising Org ရွေးပါ။', 400);
    }
    const [orgRows] = await pool.execute<VariableRow[]>(
      `SELECT id FROM system_variables
       WHERE category = 'supervising_org' AND value = :org AND is_active = 1
       LIMIT 1`,
      { org: parentValue }
    );
    if (!orgRows[0]) {
      throw new AppError('ရွေးထားသော Supervising Org မရှိပါ (သို့မဟုတ် inactive)', 400);
    }
  }

  const id = randomUUID();
  try {
    await pool.execute(
      `INSERT INTO system_variables (id, category, value, parent_value, sort_order, is_active)
       VALUES (:id, :category, :value, :parentValue, :sortOrder, 1)`,
      {
        id,
        category: input.category,
        value,
        parentValue,
        sortOrder: Number(input.sortOrder) || 0,
      }
    );
  } catch (err: any) {
    if (err?.code === 'ER_DUP_ENTRY') {
      throw new AppError('This value already exists for the category', 409);
    }
    throw err;
  }

  return {
    id,
    category: input.category as VariableCategory,
    value,
    parentValue,
    sortOrder: Number(input.sortOrder) || 0,
    isActive: true,
  };
}

export async function updateVariable(
  id: string,
  input: {
    value?: string;
    parentValue?: string | null;
    sortOrder?: number;
    isActive?: boolean;
  }
): Promise<SystemVariable> {
  await ensureVariableParentValue();
  const [rows] = await pool.execute<VariableRow[]>(
    `SELECT id, category, value, parent_value, sort_order, is_active FROM system_variables WHERE id = :id LIMIT 1`,
    { id }
  );
  const existing = rows[0];
  if (!existing) throw new AppError('Variable not found', 404);

  const value =
    input.value !== undefined ? input.value.trim() : existing.value;
  if (!value) throw new AppError('Value is required', 400);

  let parentValue =
    input.parentValue !== undefined
      ? input.parentValue?.trim() || null
      : existing.parent_value;

  if (existing.category === 'host_company') {
    if (!parentValue) {
      throw new AppError('Host Company အတွက် Supervising Org ရွေးပါ။', 400);
    }
    const [orgRows] = await pool.execute<VariableRow[]>(
      `SELECT id FROM system_variables
       WHERE category = 'supervising_org' AND value = :org AND is_active = 1
       LIMIT 1`,
      { org: parentValue }
    );
    if (!orgRows[0]) {
      throw new AppError('ရွေးထားသော Supervising Org မရှိပါ (သို့မဟုတ် inactive)', 400);
    }
  } else {
    parentValue = null;
  }

  const sortOrder =
    input.sortOrder !== undefined ? Number(input.sortOrder) : existing.sort_order;
  const isActive =
    input.isActive !== undefined ? (input.isActive ? 1 : 0) : existing.is_active;

  try {
    await pool.execute(
      `UPDATE system_variables
       SET value = :value, parent_value = :parentValue, sort_order = :sortOrder, is_active = :isActive
       WHERE id = :id`,
      { id, value, parentValue, sortOrder, isActive }
    );
  } catch (err: any) {
    if (err?.code === 'ER_DUP_ENTRY') {
      throw new AppError('This value already exists for the category', 409);
    }
    throw err;
  }

  return {
    id,
    category: existing.category,
    value,
    parentValue,
    sortOrder,
    isActive: !!isActive,
  };
}

export async function deleteVariable(id: string): Promise<void> {
  const [result] = await pool.execute<ResultSetHeader>(
    `DELETE FROM system_variables WHERE id = :id`,
    { id }
  );
  if (result.affectedRows === 0) throw new AppError('Variable not found', 404);
}
