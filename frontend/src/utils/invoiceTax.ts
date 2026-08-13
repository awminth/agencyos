/** totalAmount on invoices = subtotal excl. tax */

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

/** Prefer API amountDue; otherwise derive from subtotal + taxRate. */
export function invoiceAmountDue(inv: {
  totalAmount?: number;
  taxRate?: number;
  amountDue?: number;
}): number {
  if (inv.amountDue != null && Number.isFinite(Number(inv.amountDue))) {
    return Number(inv.amountDue);
  }
  return calcAmountDue(Number(inv.totalAmount) || 0, Number(inv.taxRate) || 0);
}
