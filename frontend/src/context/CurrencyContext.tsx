import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import {
  convertAmount,
  currencySymbol,
  DEFAULT_CURRENCY_SETTINGS,
  formatMoneyValue,
  type CurrencySettings,
  type DisplayCurrency,
  type MoneyCurrency,
} from '../utils/currency';
import { parseApiResponse } from '../utils/api';

const STORAGE_KEY = 'agency_os_currency';

interface CurrencyContextValue extends CurrencySettings {
  loading: boolean;
  refresh: () => Promise<void>;
  saveSettings: (next: Partial<CurrencySettings>) => Promise<CurrencySettings>;
  setDisplayCurrency: (displayCurrency: DisplayCurrency) => Promise<void>;
  convert: (amount: number, from?: MoneyCurrency) => number;
  formatMoney: (amount: number, from?: MoneyCurrency, compact?: boolean) => string;
  symbol: string;
  label: string;
}

const CurrencyContext = createContext<CurrencyContextValue | null>(null);

function readCached(): CurrencySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...DEFAULT_CURRENCY_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<CurrencySettings>;
    const rate = Number(parsed.jpyToMmkRate);
    return {
      jpyToMmkRate:
        Number.isFinite(rate) && rate > 0
          ? rate
          : DEFAULT_CURRENCY_SETTINGS.jpyToMmkRate,
      displayCurrency: parsed.displayCurrency === 'MMK' ? 'MMK' : 'JPY',
    };
  } catch {
    return { ...DEFAULT_CURRENCY_SETTINGS };
  }
}

function writeCached(settings: CurrencySettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

export function CurrencyProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<CurrencySettings>(() => readCached());
  const [loading, setLoading] = useState(true);

  const apply = useCallback((next: CurrencySettings) => {
    setSettings(next);
    writeCached(next);
  }, []);

  const refresh = useCallback(async () => {
    try {
      const res = await fetch('/api/settings/currency');
      const data = await parseApiResponse<CurrencySettings>(res);
      apply({
        jpyToMmkRate: Number(data.jpyToMmkRate) || DEFAULT_CURRENCY_SETTINGS.jpyToMmkRate,
        displayCurrency: data.displayCurrency === 'MMK' ? 'MMK' : 'JPY',
      });
    } catch (err) {
      console.error('Failed to load currency settings', err);
    } finally {
      setLoading(false);
    }
  }, [apply]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const saveSettings = useCallback(
    async (next: Partial<CurrencySettings>) => {
      const res = await fetch('/api/settings/currency', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      });
      const data = await parseApiResponse<CurrencySettings>(res);
      const normalized: CurrencySettings = {
        jpyToMmkRate: Number(data.jpyToMmkRate) || DEFAULT_CURRENCY_SETTINGS.jpyToMmkRate,
        displayCurrency: data.displayCurrency === 'MMK' ? 'MMK' : 'JPY',
      };
      apply(normalized);
      return normalized;
    },
    [apply]
  );

  const setDisplayCurrency = useCallback(
    async (displayCurrency: DisplayCurrency) => {
      await saveSettings({ displayCurrency });
    },
    [saveSettings]
  );

  const convert = useCallback(
    (amount: number, from: MoneyCurrency = 'JPY') =>
      convertAmount(amount, from, settings.displayCurrency, settings.jpyToMmkRate),
    [settings.displayCurrency, settings.jpyToMmkRate]
  );

  const formatMoney = useCallback(
    (amount: number, from: MoneyCurrency = 'JPY', compact = false) =>
      formatMoneyValue(amount, {
        from,
        displayCurrency: settings.displayCurrency,
        jpyToMmkRate: settings.jpyToMmkRate,
        compact,
      }),
    [settings.displayCurrency, settings.jpyToMmkRate]
  );

  const value = useMemo<CurrencyContextValue>(
    () => ({
      ...settings,
      loading,
      refresh,
      saveSettings,
      setDisplayCurrency,
      convert,
      formatMoney,
      symbol: currencySymbol(settings.displayCurrency),
      label: settings.displayCurrency,
    }),
    [
      settings,
      loading,
      refresh,
      saveSettings,
      setDisplayCurrency,
      convert,
      formatMoney,
    ]
  );

  return (
    <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const ctx = useContext(CurrencyContext);
  if (!ctx) throw new Error('useCurrency must be used within CurrencyProvider');
  return ctx;
}
