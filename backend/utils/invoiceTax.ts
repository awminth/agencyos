/** Tax helpers — totalAmount on invoices is subtotal excl. tax. */

export function normalizeTaxRate(value: unknown, fallback = 0): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(100, Math.round(n * 100) / 100);
}

export function calcTaxAmount(subtotalExcl: number, taxRate: number): number {
  const rate = normalizeTaxRate(taxRate);
  if (rate <= 0 || subtotalExcl <= 0) return 0;
  return Math.round(subtotalExcl * rate) / 100;
}

export function calcAmountDue(subtotalExcl: number, taxRate: number): number {
  return Math.round((Number(subtotalExcl) + calcTaxAmount(subtotalExcl, taxRate)) * 100) / 100;
}
