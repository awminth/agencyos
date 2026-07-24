import { randomUUID } from 'crypto';

/** Fits VARCHAR(36): short prefix + compact id (no UUID hyphens). */
export function newId(prefix: string): string {
  const compact = randomUUID().replace(/-/g, '').slice(0, 16);
  const safePrefix = prefix.replace(/[^a-z0-9]/gi, '').slice(0, 8) || 'id';
  return `${safePrefix}_${compact}`; // e.g. w_a1b2c3d4e5f67890 = ≤25 chars
}

export function toDateStr(value: unknown): string {
  if (value == null) return '';
  if (value instanceof Date) return value.toISOString().split('T')[0];
  const s = String(value);
  return s.includes('T') ? s.split('T')[0] : s.slice(0, 10);
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
