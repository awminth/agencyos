import React, { useState } from 'react';
import { Invoice, InvoicePayment } from '../types';
import { Banknote, X } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import type { MoneyCurrency } from '../utils/currency';
import { invoiceAmountDue } from '../utils/invoiceTax';

interface InvoicePayModalProps {
  invoice: Invoice;
  onClose: () => void;
  onSubmit: (payload: Partial<InvoicePayment>) => Promise<void>;
}

export const InvoicePayModal: React.FC<InvoicePayModalProps> = ({
  invoice,
  onClose,
  onSubmit,
}) => {
  const { t } = useLanguage();
  const { formatMoney } = useCurrency();
  const outstanding = Math.max(
    0,
    Number(invoice.outstandingAmount) ||
      invoiceAmountDue(invoice) - (Number(invoice.amountReceived) || 0)
  );
  const [amount, setAmount] = useState(outstanding);
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split('T')[0]);
  const [receiptNo, setReceiptNo] = useState('');
  const [notes, setNotes] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (amount <= 0) return;
    if (amount > outstanding + 0.009) {
      setError(
        `Amount exceeds outstanding balance (${formatMoney(
          outstanding,
          invoice.currency as MoneyCurrency
        )})`
      );
      return;
    }
    setError('');
    setSaving(true);
    try {
      await onSubmit({
        amount,
        paymentDate,
        receiptNo: receiptNo || undefined,
        notes: notes || undefined,
        currency: invoice.currency as MoneyCurrency,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Payment failed');
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    'w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 focus:border-blue-600 focus:outline-none';

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-xs sm:items-center sm:p-4">
      <div className="w-full max-w-md overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <div className="flex items-center gap-2">
            <div className="rounded-xl bg-emerald-50 p-2 text-emerald-600">
              <Banknote className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-slate-50">
                {t('invoices.payTitle')}
              </h3>
              <p className="font-mono text-[11px] text-slate-500">{invoice.invoiceNo}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="cursor-pointer rounded-lg p-1.5 text-slate-400">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3 px-4 py-4">
          <p className="text-xs text-slate-500">
            {t('invoices.outstanding')}:{' '}
            <strong className="text-amber-700">
              {formatMoney(outstanding, invoice.currency as MoneyCurrency)}
            </strong>
          </p>
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-medium text-rose-700">
              {error}
            </p>
          )}
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              {t('invoices.payAmount')} *
            </label>
            <input
              type="number"
              min={0.01}
              max={outstanding || undefined}
              step="any"
              required
              value={amount}
              onChange={(e) => {
                setAmount(Number(e.target.value));
                setError('');
              }}
              className={`${inputClass} font-mono font-bold`}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              {t('invoices.payDate')} *
            </label>
            <input
              type="date"
              required
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              className={inputClass}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              {t('invoices.colReceipt')}
            </label>
            <input
              type="text"
              value={receiptNo}
              onChange={(e) => setReceiptNo(e.target.value)}
              className={`${inputClass} font-mono`}
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              {t('workerModal.notes')}
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className={inputClass}
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xl bg-slate-100 px-4 py-2 text-xs font-semibold text-slate-700"
            >
              {t('common.cancel')}
            </button>
            <button
              type="submit"
              disabled={saving || amount <= 0 || amount > outstanding + 0.009}
              className="cursor-pointer rounded-xl bg-emerald-600 px-4 py-2 text-xs font-bold text-white disabled:opacity-60"
            >
              {saving ? t('common.loading') : t('invoices.paySubmit')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
