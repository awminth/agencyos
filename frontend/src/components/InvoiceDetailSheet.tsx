import React from 'react';
import { Printer, Edit, Trash2, X, Receipt } from 'lucide-react';
import { Invoice } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import type { MoneyCurrency } from '../utils/currency';
import { invoiceAmountDue } from '../utils/invoiceTax';

interface InvoiceDetailSheetProps {
  invoice: Invoice;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  onClose: () => void;
  onPrint: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

function feeTypeLabel(type: string | undefined, t: (key: string) => string) {
  if (type === 'flight') return t('workerModal.flightFee');
  if (type === 'training') return t('workerModal.trainingFee');
  if (type === 'introduction') return t('students.introductionFee');
  return t('workerModal.managementFee');
}

export const InvoiceDetailSheet: React.FC<InvoiceDetailSheetProps> = ({
  invoice,
  canRead,
  canUpdate,
  canDelete,
  onClose,
  onPrint,
  onEdit,
  onDelete,
}) => {
  const { t } = useLanguage();
  const { formatMoney } = useCurrency();
  const money = (amount: number, currency?: string) =>
    formatMoney(amount, (currency as MoneyCurrency) || 'JPY');

  const isStudent = invoice.feeType === 'introduction';
  const isHostInvoice = !isStudent && Boolean(invoice.hostCompany);
  const rows: { label: string; value: string }[] = [
    { label: t('invoices.colInvoice'), value: invoice.invoiceNo },
    { label: 'Fee Type', value: feeTypeLabel(invoice.feeType, t) },
    {
      label: isStudent
        ? t('students.schoolName')
        : isHostInvoice
          ? t('invoices.colHost')
          : t('invoices.colWorker'),
      value: isStudent
        ? invoice.supervisingOrg || invoice.workerName || '—'
        : isHostInvoice
          ? invoice.hostCompany
          : `${invoice.workerName} · ${invoice.passportNo}`,
    },
    ...(isStudent
      ? []
      : isHostInvoice
        ? [
            { label: t('reports.colSupervisingOrg'), value: invoice.supervisingOrg || '—' },
            {
              label: t('invoices.workerCount'),
              value: String(invoice.workerCount ?? invoice.lines?.length ?? 0),
            },
          ]
        : [
            { label: t('invoices.colHost'), value: invoice.hostCompany || '—' },
            { label: t('reports.colSupervisingOrg'), value: invoice.supervisingOrg || '—' },
          ]),
    { label: t('invoices.billingPeriod'), value: invoice.billingPeriod },
    {
      label: t('invoices.colDates'),
      value: `${t('invoices.last')}: ${invoice.lastInvoiceDate || '—'} · ${t('invoices.next')}: ${invoice.nextInvoiceDate || '—'}`,
    },
    { label: t('invoices.currency'), value: invoice.currency },
    { label: t('invoices.total'), value: money(invoiceAmountDue(invoice), invoice.currency) },
    { label: t('invoices.received'), value: money(invoice.amountReceived || 0, invoice.currency) },
    {
      label: t('invoices.outstanding'),
      value: money(invoice.outstandingAmount || 0, invoice.currency),
    },
    {
      label: t('invoices.colReceipt'),
      value: invoice.receiptNo
        ? `${invoice.receiptNo} (${invoice.paymentReceivedDate || 'N/A'})`
        : '—',
    },
    {
      label: t('invoices.receiptSentDate'),
      value: invoice.receiptSentDate || '—',
    },
    { label: t('common.status'), value: invoice.status },
    ...(invoice.notes
      ? [{ label: t('workerDetail.notesTitle'), value: invoice.notes }]
      : []),
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-900/60 p-0 backdrop-blur-xs sm:items-center sm:p-4">
      <div className="flex max-h-[min(92dvh,100%)] w-full max-w-lg flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-2xl dark:bg-slate-900">
        <div className="flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-700">
          <div className="flex min-w-0 items-center gap-2">
            <div className="rounded-xl bg-blue-50 p-2 text-blue-600 dark:bg-blue-500/15">
              <Receipt className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold text-slate-900 dark:text-slate-50">
                {t('invoices.detailTitle')}
              </h3>
              <p className="truncate font-mono text-[11px] text-slate-500 dark:text-slate-400">
                {invoice.invoiceNo}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:text-slate-800 dark:hover:text-white"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4">
          {rows.map((r) => (
            <div key={r.label} className="border-b border-slate-100 pb-2.5 last:border-0 dark:border-slate-800">
              <span className="mb-0.5 block text-[10px] font-bold tracking-wider text-slate-400 uppercase">
                {r.label}
              </span>
              <p className="break-words text-sm font-semibold text-slate-800 dark:text-slate-100">
                {r.value}
              </p>
            </div>
          ))}
        </div>

        <div className="flex shrink-0 flex-wrap gap-2 border-t border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-950">
          {canRead && (
            <button
              type="button"
              onClick={onPrint}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-blue-600 px-3 py-2 text-xs font-semibold text-white"
            >
              <Printer className="h-3.5 w-3.5" />
              Print
            </button>
          )}
          {canUpdate && (
            <button
              type="button"
              onClick={onEdit}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-semibold text-white"
            >
              <Edit className="h-3.5 w-3.5" />
              {t('common.edit')}
            </button>
          )}
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="inline-flex cursor-pointer items-center justify-center gap-1.5 rounded-lg bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 ring-1 ring-red-200 dark:bg-red-500/15 dark:text-red-300 dark:ring-red-500/30"
            >
              <Trash2 className="h-3.5 w-3.5" />
              {t('common.delete')}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
