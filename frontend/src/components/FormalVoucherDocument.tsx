import React from 'react';
import { useLanguage } from '../context/LanguageContext';
import type { PrintLetterhead } from '../utils/printLetterhead';
import { letterheadContactLine } from '../utils/printLetterhead';
import { resolveBrandLogo } from '../utils/brand';

export interface FormalVoucherLine {
  description: string;
  detail?: string;
  qty?: string | number;
  unitPrice: string;
  amount: string;
}

interface FormalVoucherDocumentProps {
  id: string;
  /** Large title e.g. PAYMENT VOUCHER */
  docTitle: string;
  docNoLabel: string;
  docNo: string;
  dateLabel: string;
  dateValue: string;
  billedToLabel: string;
  billedToName: string;
  billedToAttn?: string;
  introText?: string;
  subjectLabel?: string;
  subject?: string;
  highlightLabel: string;
  highlightValue: string;
  issuer: PrintLetterhead;
  lines: FormalVoucherLine[];
  remarksLabel: string;
  remarks?: string;
  totals: { label: string; value: string; emphasis?: boolean }[];
}

function formatDisplayDate(iso: string): string {
  if (!iso) return '—';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/** Same formal layout as invoice preview — used for payment / summary vouchers. */
export const FormalVoucherDocument: React.FC<FormalVoucherDocumentProps> = ({
  id,
  docTitle,
  docNoLabel,
  docNo,
  dateLabel,
  dateValue,
  billedToLabel,
  billedToName,
  billedToAttn,
  introText,
  subjectLabel,
  subject,
  highlightLabel,
  highlightValue,
  issuer,
  lines,
  remarksLabel,
  remarks,
  totals,
}) => {
  const { t } = useLanguage();

  return (
    <div
      id={id}
      className="w-full bg-white px-6 py-7 text-slate-900 shadow-sm sm:px-8"
      style={{ fontFamily: '"Segoe UI", "Helvetica Neue", Arial, sans-serif' }}
    >
      <div className="flex items-start justify-between gap-4 border-b-2 border-[#1e3a5f] pb-4">
        <div>
          <h1 className="text-3xl font-bold tracking-[0.08em] text-[#1e3a5f]">{docTitle}</h1>
        </div>
        <div className="text-right text-xs leading-relaxed text-slate-600">
          <p>
            <span className="font-semibold text-slate-500">{docNoLabel}:</span>{' '}
            <span className="font-mono font-bold text-slate-900">{docNo || '—'}</span>
          </p>
          <p className="mt-1">
            <span className="font-semibold text-slate-500">{dateLabel}:</span>{' '}
            <span className="font-medium text-slate-900">{formatDisplayDate(dateValue)}</span>
          </p>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-6 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-bold tracking-[0.14em] text-[#1e3a5f] uppercase">
            {billedToLabel}
          </p>
          <p className="mt-1 text-sm font-bold text-[#1e3a5f]">{billedToName || '—'}</p>
          {billedToAttn !== undefined ? (
            <p className="mt-1 text-xs text-slate-600">
              {t('invoices.attn')}: {billedToAttn || '—'}
            </p>
          ) : null}
          {introText ? (
            <p className="mt-3 text-xs leading-relaxed text-slate-600">{introText}</p>
          ) : null}
          {subjectLabel ? (
            <p className="mt-2 text-xs text-slate-700">
              <span className="font-semibold text-slate-500">{subjectLabel}:</span>{' '}
              {subject || '—'}
            </p>
          ) : null}
          <p className="mt-3 text-sm font-bold text-slate-900">
            {highlightLabel}:{' '}
            <span className="font-mono text-[#1e3a5f]">{highlightValue}</span>
          </p>
        </div>

        <div className="sm:text-right">
          <p className="text-[10px] font-bold tracking-[0.14em] text-[#1e3a5f] uppercase">
            {t('invoices.issuer')}
          </p>
          <p className="mt-1 text-sm font-bold text-[#1e3a5f]">
            {issuer.agencyName || '—'}
          </p>
          <img
            src={resolveBrandLogo(issuer.logoData)}
            alt=""
            className="mt-2 h-16 w-auto max-w-[140px] object-contain sm:ml-auto"
          />
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
              <th className="w-8 px-2 py-2 font-semibold">No.</th>
              <th className="px-2 py-2 font-semibold">{t('invoices.colDescription')}</th>
              <th className="w-14 px-2 py-2 text-right font-semibold">
                {t('invoices.colQty')}
              </th>
              <th className="w-24 px-2 py-2 text-right font-semibold">
                {t('invoices.colUnitPrice')}
              </th>
              <th className="w-24 px-2 py-2 text-right font-semibold">
                {t('invoices.lineAmount')}
              </th>
            </tr>
          </thead>
          <tbody>
            {lines.length === 0 ? (
              <tr className="border-t border-slate-100">
                <td className="px-2 py-2 text-slate-400">1</td>
                <td className="px-2 py-2 text-slate-400">—</td>
                <td className="px-2 py-2 text-right font-mono">—</td>
                <td className="px-2 py-2 text-right font-mono">—</td>
                <td className="px-2 py-2 text-right font-mono">—</td>
              </tr>
            ) : (
              lines.map((line, idx) => (
                <tr
                  key={`${line.description}-${idx}`}
                  className="border-t border-slate-100 odd:bg-slate-50/60"
                >
                  <td className="px-2 py-2 text-slate-500">{idx + 1}</td>
                  <td className="px-2 py-2">
                    <div className="font-medium text-slate-800">{line.description}</div>
                    {line.detail ? (
                      <div className="font-mono text-[10px] text-slate-400">{line.detail}</div>
                    ) : null}
                  </td>
                  <td className="px-2 py-2 text-right font-mono">{line.qty ?? 1}</td>
                  <td className="px-2 py-2 text-right font-mono">{line.unitPrice}</td>
                  <td className="px-2 py-2 text-right font-mono">{line.amount}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:justify-between">
        <div className="max-w-sm space-y-3 text-xs">
          <div>
            <p className="text-[10px] font-bold tracking-[0.12em] text-[#1e3a5f] uppercase">
              {remarksLabel}
            </p>
            <p className="mt-1 whitespace-pre-wrap text-slate-600">
              {remarks || '································'}
            </p>
          </div>
        </div>

        <div className="min-w-[220px] self-end text-xs">
          {totals.map((row, idx) => {
            const emphasize =
              row.emphasis === true ||
              (row.emphasis !== false && idx === totals.length - 1 && !totals.some((r) => r.emphasis));
            if (emphasize) {
              return (
                <div
                  key={row.label}
                  className="mt-1 flex justify-between gap-6 border-b-2 border-[#1e3a5f] py-2 text-sm font-bold text-[#1e3a5f]"
                >
                  <span>{row.label}</span>
                  <span className="font-mono">{row.value}</span>
                </div>
              );
            }
            return (
              <div
                key={row.label}
                className="flex justify-between gap-6 border-b border-slate-100 py-1.5"
              >
                <span className="text-slate-500">{row.label}</span>
                <span className="font-mono font-semibold">{row.value}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
