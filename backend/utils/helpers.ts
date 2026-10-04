import { randomUUID } from 'crypto';

/** Fits VARCHAR(36): short prefix + compact id (no UUID hyphens). */
export function newId(prefix: string): string {
  const compact = randomUUID().replace(/-/g, '').slice(0, 16);
  const safePrefix = prefix.replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'id';
  return `${safePrefix}_${compact}`; // e.g. w_a1b2c3d4e5f67890 = ≤25 chars
}

function pad2(n: number): string {
  return String(n).padStart(2, '0');
}

export function toDateStr(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().split('T')[0];
  const s = String(value);
  return s.includes('T') ? s.split('T')[0] : s.slice(0, 10);
}

/**
 * Parse Excel/import date strings into YYYY-MM-DD for MySQL DATE columns.
 * Accepts Date, Excel serial number, YYYY-MM-DD, and DD.MM.YYYY / DD/MM/YYYY.
 */
export function parseImportDate(value: unknown, fallback = ''): string {
  if (value == null || value === '') return fallback;
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return `${value.getFullYear()}-${pad2(value.getMonth() + 1)}-${pad2(value.getDate())}`;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    // Excel serial date (days since 1899-12-30)
    const epoch = Date.UTC(1899, 11, 30) + Math.round(value) * 86400000;
    const d = new Date(epoch);
    if (!Number.isNaN(d.getTime())) {
      return `${d.getUTCFullYear()}-${pad2(d.getUTCMonth() + 1)}-${pad2(d.getUTCDate())}`;
    }
  }

  const s = String(value).replace(/\s+/g, ' ').trim();
  if (!s) return fallback;

  let m = s.match(/^(\d{4})[./\-](\d{1,2})[./\-](\d{1,2})/);
  if (m) return `${m[1]}-${pad2(Number(m[2]))}-${pad2(Number(m[3]))}`;

  m = s.match(/^(\d{1,2})[./\-](\d{1,2})[./\-](\d{4})/);
  if (m) {
    const day = Number(m[1]);
    const month = Number(m[2]);
    const year = Number(m[3]);
    if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
      return `${year}-${pad2(month)}-${pad2(day)}`;
    }
  }

  const d = new Date(s);
  if (!Number.isNaN(d.getTime())) {
    return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
  }
  return fallback;
}

export function toIso(value: unknown): string {
  if (value == null) return new Date().toISOString();
  if (value instanceof Date) return value.toISOString();
  return String(value);
}

export function num(value: unknown, fallback = 0): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}
