/** Shared Paid (blue) vs unpaid/partial (amber) styling for fee lists. */

export type BalanceTone = 'paid' | 'remain' | 'neutral';

export function balanceTone(remainAmount: number, totalAmount: number): BalanceTone {
  if (totalAmount > 0 && remainAmount <= 0) return 'paid';
  if (remainAmount > 0) return 'remain';
  return 'neutral';
}

export function balanceStatusKey(tone: BalanceTone, totalPaid: number) {
  if (tone === 'paid') return 'status.paid' as const;
  if (tone === 'remain' && totalPaid > 0) return 'status.partial' as const;
  return 'status.pending' as const;
}

/** Noticeable row tint + left accent. Locked against table hover override. */
export function balanceRowClass(tone: BalanceTone) {
  if (tone === 'paid') {
    return 'fee-status-row fee-status-row-paid border-l-4 border-l-blue-600';
  }
  if (tone === 'remain') {
    return 'fee-status-row fee-status-row-remain border-l-4 border-l-amber-500';
  }
  return '';
}

export function balanceBadgeClass(tone: BalanceTone) {
  if (tone === 'paid') return 'bg-blue-600 text-white';
  if (tone === 'remain') return 'bg-amber-500 text-white';
  return 'bg-slate-200 text-slate-700';
}

export function balanceRemainClass(tone: BalanceTone) {
  if (tone === 'paid') return 'text-blue-700';
  if (tone === 'remain') return 'text-amber-800';
  return 'text-slate-600';
}

export function balancePaidAmountClass(tone: BalanceTone) {
  if (tone === 'paid') return 'text-blue-700';
  if (tone === 'remain') return 'text-amber-800';
  return 'text-slate-700';
}

export function invoiceStatusRowClass(status: string) {
  if (status === 'Paid') return balanceRowClass('paid');
  if (status === 'Partial' || status === 'Overdue' || status === 'Pending') {
    return balanceRowClass('remain');
  }
  return '';
}

export function invoiceStatusBadgeClass(status: string) {
  if (status === 'Paid') return balanceBadgeClass('paid');
  if (status === 'Partial' || status === 'Overdue') return balanceBadgeClass('remain');
  return 'bg-amber-100 text-amber-900';
}

/** Prefer the later YYYY-MM-DD (or ISO) string. */
export function laterDate(a?: string | null, b?: string | null): string | undefined {
  const aa = (a || '').trim();
  const bb = (b || '').trim();
  if (!aa) return bb || undefined;
  if (!bb) return aa || undefined;
  return aa >= bb ? aa : bb;
}
