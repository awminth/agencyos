export type MoneyCurrency = 'JPY' | 'MMK' | 'USD';
export type DisplayCurrency = 'JPY' | 'MMK';

export interface CurrencySettings {
  jpyToMmkRate: number;
  displayCurrency: DisplayCurrency;
}

export const DEFAULT_CURRENCY_SETTINGS: CurrencySettings = {
  jpyToMmkRate: 20,
  displayCurrency: 'JPY',
};

/** Convert amount from source currency into target (JPY/MMK). USD stays as-is. */
export function convertAmount(
  amount: number,
  from: MoneyCurrency,
  to: DisplayCurrency,
  jpyToMmkRate: number
): number {
  const value = Number(amount) || 0;
  const rate = jpyToMmkRate > 0 ? jpyToMmkRate : 1;

  if (from === 'USD') return value;
  if (from === to) return value;

  if (from === 'JPY' && to === 'MMK') return value * rate;
  if (from === 'MMK' && to === 'JPY') return value / rate;

  return value;
}

export function currencySymbol(code: MoneyCurrency | DisplayCurrency): string {
  if (code === 'MMK') return 'Ks';
  if (code === 'USD') return '$';
  return '¥';
}

export function formatMoneyValue(
  amount: number,
  options?: {
    from?: MoneyCurrency;
    displayCurrency?: DisplayCurrency;
    jpyToMmkRate?: number;
    compact?: boolean;
  }
): string {
  const from = options?.from || 'JPY';
  const display = options?.displayCurrency || 'JPY';
  const rate = options?.jpyToMmkRate ?? 1;
  const converted =
    from === 'USD' ? Number(amount) || 0 : convertAmount(amount, from, display, rate);
  const code: MoneyCurrency = from === 'USD' ? 'USD' : display;
  const symbol = currencySymbol(code);

  if (options?.compact) {
    const abs = Math.abs(converted);
    if (abs >= 1_000_000) {
      return `${symbol}${(converted / 1_000_000).toFixed(1)}M`;
    }
    if (abs >= 1_000) {
      return `${symbol}${(converted / 1_000).toFixed(1)}K`;
    }
  }

  const rounded = code === 'JPY' ? Math.round(converted) : Math.round(converted * 100) / 100;
  return `${symbol}${rounded.toLocaleString(undefined, {
    maximumFractionDigits: code === 'JPY' ? 0 : 2,
  })}`;
}
