import React, { useEffect, useState } from 'react';
import type { BankAccount } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { calcAmountDue, calcTaxAmount } from '../utils/invoiceTax';
import { useCurrency } from '../context/CurrencyContext';
import type { MoneyCurrency } from '../utils/currency';

export interface FormalInvoiceFormValues {
  billedToAttn: string;
  subject: string;
  taxRate: number;
  bankAccountId: string;
}

interface FormalInvoiceFieldsProps {
  values: FormalInvoiceFormValues;
  onChange: (next: FormalInvoiceFormValues) => void;
  subtotal: number;
  currency: MoneyCurrency | string;
  inputClass: string;
}

export const FormalInvoiceFields: React.FC<FormalInvoiceFieldsProps> = ({
  values,
  onChange,
  subtotal,
  currency,
  inputClass,
}) => {
  const { t } = useLanguage();
  const { formatMoney } = useCurrency();
  const [banks, setBanks] = useState<BankAccount[]>([]);

  useEffect(() => {
    fetch('/api/settings/bank-accounts?activeOnly=1')
      .then((r) => r.json())
      .then((rows: BankAccount[]) => {
        if (!Array.isArray(rows)) return;
        setBanks(rows);
        if (!values.bankAccountId) {
          const def = rows.find((b) => b.isDefault) || rows[0];
          if (def) onChange({ ...values, bankAccountId: def.id });
        }
      })
      .catch(() => undefined);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const taxAmount = calcTaxAmount(subtotal, values.taxRate);
  const amountDue = calcAmountDue(subtotal, values.taxRate);
  const moneyCur = (currency as MoneyCurrency) || 'JPY';

  return (
    <div className="space-y-3 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
      <h4 className="text-xs font-bold tracking-wider text-blue-800 uppercase">
        {t('invoices.formalSection')}
      </h4>
      <p className="text-[11px] text-slate-500">{t('invoices.formalHint')}</p>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            {t('invoices.billedToAttn')} *
          </label>
          <input
            type="text"
            required
            value={values.billedToAttn}
            onChange={(e) => onChange({ ...values, billedToAttn: e.target.value })}
            placeholder={t('invoices.billedToAttnPlaceholder')}
            className={inputClass}
          />
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            {t('invoices.subject')} *
          </label>
          <input
            type="text"
            required
            value={values.subject}
            onChange={(e) => onChange({ ...values, subject: e.target.value })}
            className={inputClass}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            {t('invoices.taxRate')} *
          </label>
          <select
            required
            value={String(values.taxRate)}
            onChange={(e) => onChange({ ...values, taxRate: Number(e.target.value) })}
            className={`${inputClass} cursor-pointer`}
          >
            <option value="10">10%</option>
            <option value="8">8%</option>
            <option value="0">0% ({t('invoices.taxExempt')})</option>
          </select>
        </div>
        <div>
          <label className="mb-1 block text-xs font-semibold text-slate-600">
            {t('invoices.bankAccount')} *
          </label>
          <select
            required
            value={values.bankAccountId}
            onChange={(e) => onChange({ ...values, bankAccountId: e.target.value })}
            className={`${inputClass} cursor-pointer`}
          >
            <option value="">—</option>
            {banks.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label || b.bankName}
                {b.isDefault ? ` (${t('settings.bankDefault')})` : ''}
              </option>
            ))}
          </select>
          {banks.length === 0 && (
            <p className="mt-1 text-[11px] text-amber-700">{t('invoices.noBankAccounts')}</p>
          )}
        </div>
      </div>

      <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs text-slate-600">
        <div className="flex justify-between gap-2">
          <span>{t('invoices.subtotalExcl')}</span>
          <span className="font-mono font-semibold">{formatMoney(subtotal, moneyCur)}</span>
        </div>
        <div className="mt-1 flex justify-between gap-2">
          <span>
            {t('invoices.consumptionTax')} ({values.taxRate}%)
          </span>
          <span className="font-mono font-semibold">{formatMoney(taxAmount, moneyCur)}</span>
        </div>
        <div className="mt-1 flex justify-between gap-2 border-t border-slate-100 pt-1 font-bold text-slate-900">
          <span>{t('invoices.amountDue')}</span>
          <span className="font-mono">{formatMoney(amountDue, moneyCur)}</span>
        </div>
      </div>
    </div>
  );
};
