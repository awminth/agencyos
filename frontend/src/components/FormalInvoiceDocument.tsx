import React from 'react';
import type { Invoice } from '../types';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import type { MoneyCurrency } from '../utils/currency';
import { calcAmountDue, calcTaxAmount, normalizeTaxRate } from '../utils/invoiceTax';
import type { PrintLetterhead } from '../utils/printLetterhead';
import { letterheadContactLine } from '../utils/printLetterhead';

export type IssuerSettings = PrintLetterhead;

interface FormalInvoiceDocumentProps {
  id: string;
  invoice: Invoice;
  issuer: IssuerSettings;
}

function formatIssueDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

function feeDescription(feeType: Invoice['feeType'], t: (k: string) => string): string {
  if (feeType === 'flight') return t('workerModal.flightFee');
  if (feeType === 'training') return t('workerModal.trainingFee');
  if (feeType === 'introduction') return t('students.introductionFee') || 'Introduction Fee';
  return t('workerModal.managementFee');
}

export const FormalInvoiceDocument: React.FC<FormalInvoiceDocumentProps> = ({
  id,
  invoice,
  issuer,
}) => {
  const { t } = useLanguage();
  const { formatMoney } = useCurrency();
  const money = (n: number) =>
    formatMoney(n, (invoice.currency as MoneyCurrency) || 'JPY');

  const isStudent = invoice.feeType === 'introduction';
  const billedName = isStudent
    ? invoice.supervisingOrg || invoice.workerName || invoice.hostCompany
    : invoice.hostCompany;
  const taxRate = normalizeTaxRate(invoice.taxRate, 0);
  const subtotal = Number(invoice.totalAmount) || 0;
  const taxAmount = invoice.taxAmount ?? calcTaxAmount(subtotal, taxRate);
  const amountDue = invoice.amountDue ?? calcAmountDue(subtotal, taxRate);
  const lines = invoice.lines || [];
  const serviceLabel = feeDescription(invoice.feeType, t);

  return (
    <div
      id={id}
      className="w-full bg-white px-6 py-7 text-slate-900 shadow-sm sm:px-8"
      style={{ fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif' }}
    >
      <div className="flex items-start justify-between gap-4 border-b-2 border-[#1e3a5f] pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-[0.08em] text-[#1e3a5f]">INVOICE</h1>
        </div>
        <div className="text-right text-xs leading-relaxed text-slate-600">
          <p>
            <span className="font-semibold text-slate-500">{t('invoices.invoiceNo')}:</span>{' '}
            <span className="font-mono font-bold text-slate-900">{invoice.invoiceNo}</span>
          </p>
          <p className="mt-1">
            <span className="font-semibold text-slate-500">{t('invoices.invoiceDate')}:</span>{' '}
            <span className="font-medium text-slate-900">
              {formatIssueDate(invoice.lastInvoiceDate)}
            </span>
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-bold tracking-[0.14em] text-[#1e3a5f] uppercase">
            {t('invoices.billedTo')}
          </p>
          <p className="mt-1 text-sm font-bold text-[#1e3a5f]">{billedName || '—'}</p>
          <p className="mt-1 text-xs text-slate-600">
            {t('invoices.attn')}: {invoice.billedToAttn || '—'}
          </p>
          <p className="mt-3 text-xs leading-relaxed text-slate-600">
            {t('invoices.introText')}
          </p>
          <p className="mt-2 text-xs text-slate-700">
            <span className="font-semibold text-slate-500">{t('invoices.subject')}:</span>{' '}
            {invoice.subject || invoice.billingPeriod || '—'}
          </p>
          <p className="mt-3 text-sm font-bold text-slate-900">
            {t('invoices.totalPayable')}:{' '}
            <span className="font-mono text-[#1e3a5f]">{money(amountDue)}</span>
          </p>
        </div>

        <div className="sm:text-right">
          <p className="text-[10px] font-bold tracking-[0.14em] text-[#1e3a5f] uppercase">
            {t('invoices.issuer')}
          </p>
          <p className="mt-1 text-sm font-bold text-[#1e3a5f]">
            {issuer.agencyName || '—'}
          </p>
          {issuer.logoData ? (
            <img
              src={issuer.logoData}
              alt=""
              className="mt-2 h-10 w-10 object-contain sm:ml-auto"
            />
          ) : null}
          {letterheadContactLine(issuer) ? (
            <p className="mt-1 text-xs leading-relaxed whitespace-pre-wrap text-slate-600">
              {letterheadContactLine(issuer)}
            </p>
          ) : null}
        </div>
      </div>

      <div className="mt-6 overflow-hidden rounded-sm border border-slate-200">
        <table className="w-full border-collapse text-left text-[11px]">
          <thead>
            <tr className="bg-[#1e3a5f] text-white">
              <th className="px-2 py-2 font-semibold w-8">No.</th>
              <th className="px-2 py-2 font-semibold">{t('invoices.colDescription')}</th>
              <th className="px-2 py-2 text-right font-semibold w-14">
                {t('invoices.colQty')}
              </th>
              <th className="px-2 py-2 text-right font-semibold w-24">
                {t('invoices.colUnitPrice')}
              </th>
              <th className="px-2 py-2 text-right font-semibold w-14">
                {t('invoices.colTaxRate')}
              </th>
              <th className="px-2 py-2 text-right font-semibold w-24">
                {t('invoices.lineAmount')}
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr className="border-t border-slate-100">
                <td className="px-2 py-2 text-slate-400">1</td>
                <td className="px-2 py-2">
                  {serviceLabel}
                  {invoice.billingPeriod ? ` — ${invoice.billingPeriod}` : ''}
                </td>
                <td className="px-2 py-2 text-right font-mono">1</td>
                <td className="px-2 py-2 text-right font-mono">{money(subtotal)}</td>
                <td className="px-2 py-2 text-right font-mono">{taxRate}%</td>
                <td className="px-2 py-2 text-right font-mono">{money(subtotal)}</td>
              </tr>
            ) : (
              lines.map((line, idx) => {
                const name =
                  'workerName' in line
                    ? line.workerName
                    : (line as { studentName?: string }).studentName || '';
                const desc = `${serviceLabel} — ${name}`;
                return (
                  <tr
                    key={line.id || idx}
                    className="border-t border-slate-100 odd:bg-slate-50/60"
                  >
                    <td className="px-2 py-2 text-slate-500">{idx + 1}</td>
                    <td className="px-2 py-2">
                      <div className="font-medium text-slate-800">{desc}</div>
                      {(line.serialNo || line.passportNo) && (
                        <div className="font-mono text-[10px] text-slate-400">
                          {[line.serialNo, line.passportNo].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </td>
                    <td className="px-2 py-2 text-right font-mono">1</td>
                    <td className="px-2 py-2 text-right font-mono">{money(line.amount)}</td>
                    <td className="px-2 py-2 text-right font-mono">{taxRate}%</td>
                    <td className="px-2 py-2 text-right font-mono">{money(line.amount)}</td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:justify-between">
        <div className="max-w-sm space-y-3 text-xs">
          <div>
            <p className="text-[10px] font-bold tracking-[0.12em] text-[#1e3a5f] uppercase">
              {t('invoices.remarks')}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-slate-600">
              {invoice.notes || '································'}
            </p>
          </div>
          <div>
            <p className="text-[10px] font-bold tracking-[0.12em] text-[#1e3a5f] uppercase">
              {t('invoices.bankTransferInfo')}
            </p>
            <div className="mt-1 space-y-0.5 text-slate-700">
              <p>
                <span className="text-slate-500">{t('settings.bankName')}:</span>{' '}
                {invoice.bankName || '—'}
              </p>
              <p>
                <span className="text-slate-500">{t('settings.branchCode')}:</span>{' '}
                {invoice.branchCode || '—'}
              </p>
              <p>
                <span className="text-slate-500">{t('settings.branchName')}:</span>{' '}
                {invoice.branchName || '—'}
              </p>
              <p>
                <span className="text-slate-500">{t('settings.accountNumber')}:</span>{' '}
                <span className="font-mono font-semibold">{invoice.accountNumber || '—'}</span>
              </p>
              <p>
                <span className="text-slate-500">{t('settings.accountHolder')}:</span>{' '}
                {invoice.accountHolder || '—'}
              </p>
            </div>
          </div>
        </div>

        <div className="min-w-[220px] self-end text-xs">
          <div className="flex justify-between gap-6 border-b border-slate-100 py-1.5">
            <span className="text-slate-500">{t('invoices.subtotalExcl')}</span>
            <span className="font-mono font-semibold">{money(subtotal)}</span>
          </div>
          <div className="flex justify-between gap-6 border-b border-slate-100 py-1.5">
            <span className="text-slate-500">
              {t('invoices.consumptionTax')} ({taxRate}%)
            </span>
            <span className="font-mono font-semibold">{money(taxAmount)}</span>
          </div>
          <div className="mt-1 flex justify-between gap-6 border-b-2 border-[#1e3a5f] py-2 text-sm font-bold text-[#1e3a5f]">
            <span>{t('invoices.totalAmountDue')}</span>
            <span className="font-mono">{money(amountDue)}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
