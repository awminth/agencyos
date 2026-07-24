import type { ResultSetHeader, RowDataPacket } from 'mysql2';
import { randomUUID } from 'crypto';
import { pool } from '../config/db.js';
import { AppError } from '../middlewares/errorHandler.js';

export type VariableCategory =
  | 'visa_type'
  | 'supervising_org'
  | 'host_company'
  | 'job_category';

export interface PrintSettings {
  agencyName: string;
  address: string;
  phone: string;
  logoData: string | null;
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
  sortOrder: number;
  isActive: boolean;
}

interface PrintRow extends RowDataPacket {
  agency_name: string;
  address: string | null;
  phone: string | null;
  logo_data: string | null;
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
  sort_order: number;
  is_active: number;
}

const VALID_CATEGORIES: VariableCategory[] = [
  'visa_type',
  'supervising_org',
  'host_company',
  'job_category',
];

export async function getPrintSettings(): Promise<PrintSettings> {
  const [rows] = await pool.execute<PrintRow[]>(
    `SELECT agency_name, address, phone, logo_data FROM print_settings WHERE id = 1 LIMIT 1`
  );

  if (!rows[0]) {
    return { agencyName: '', address: '', phone: '', logoData: null };
  }

  return {
    agencyName: rows[0].agency_name || '',
    address: rows[0].address || '',
    phone: rows[0].phone || '',
    logoData: rows[0].logo_data || null,
  };
}

export async function updatePrintSettings(input: {
  agencyName?: string;
  address?: string;
  phone?: string;
  logoData?: string | null;
}): Promise<PrintSettings> {
  const current = await getPrintSettings();
  const agencyName = (input.agencyName ?? current.agencyName ?? '').trim();
  const address = (input.address ?? current.address ?? '').trim() || null;
  const phone = (input.phone ?? current.phone ?? '').trim() || null;
  const logoData =
    input.logoData !== undefined ? input.logoData : current.logoData;

  await pool.execute(
    `INSERT INTO print_settings (id, agency_name, address, phone, logo_data)
     VALUES (1, :agencyName, :address, :phone, :logoData)
     ON DUPLICATE KEY UPDATE
       agency_name = VALUES(agency_name),
       address = VALUES(address),
       phone = VALUES(phone),
       logo_data = VALUES(logo_data)`,
    { agencyName, address, phone, logoData }
  );

  return getPrintSettings();
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
  let sql = `SELECT id, category, value, sort_order, is_active FROM system_variables`;
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
  return rows.map((r) => ({
    id: r.id,
    category: r.category,
    value: r.value,
    sortOrder: r.sort_order,
    isActive: !!r.is_active,
  }));
}

export async function createVariable(input: {
  category: string;
  value: string;
  sortOrder?: number;
}): Promise<SystemVariable> {
  if (!VALID_CATEGORIES.includes(input.category as VariableCategory)) {
    throw new AppError('Invalid variable category', 400);
  }
  const value = input.value.trim();
  if (!value) throw new AppError('Value is required', 400);

  const id = randomUUID();
  try {
    await pool.execute(
      `INSERT INTO system_variables (id, category, value, sort_order, is_active)
       VALUES (:id, :category, :value, :sortOrder, 1)`,
      {
        id,
        category: input.category,
        value,
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
    sortOrder: Number(input.sortOrder) || 0,
    isActive: true,
  };
}

export async function updateVariable(
  id: string,
  input: { value?: string; sortOrder?: number; isActive?: boolean }
): Promise<SystemVariable> {
  const [rows] = await pool.execute<VariableRow[]>(
    `SELECT id, category, value, sort_order, is_active FROM system_variables WHERE id = :id LIMIT 1`,
    { id }
  );
  const existing = rows[0];
  if (!existing) throw new AppError('Variable not found', 404);

  const value =
    input.value !== undefined ? input.value.trim() : existing.value;
  if (!value) throw new AppError('Value is required', 400);

  const sortOrder =
    input.sortOrder !== undefined ? Number(input.sortOrder) : existing.sort_order;
  const isActive =
    input.isActive !== undefined ? (input.isActive ? 1 : 0) : existing.is_active;

  try {
    await pool.execute(
      `UPDATE system_variables
       SET value = :value, sort_order = :sortOrder, is_active = :isActive
       WHERE id = :id`,
      { id, value, sortOrder, isActive }
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
