import React, { useState } from 'react';
import { Copy, Printer, X, type LucideIcon } from 'lucide-react';
import { copyElementAsImage, printElement } from '../utils/exportUtils';
import { showError, showSuccess } from '../utils/swal';
import { useLanguage } from '../context/LanguageContext';

export interface PosField {
  label: string;
  value: string;
}

interface PosPrintPreviewProps {
  title: string;
  printAreaId: string;
  printFilename: string;
  icon: LucideIcon;
  onClose: () => void;
  children: React.ReactNode;
  zIndexClass?: string;
}

/** Modal chrome + POS-width print body (80mm thermal-friendly). */
export const PosPrintPreview: React.FC<PosPrintPreviewProps> = ({
  title,
  printAreaId,
  printFilename,
  icon: Icon,
  onClose,
  children,
  zIndexClass = 'z-50',
}) => {
  const { t } = useLanguage();
  const [copying, setCopying] = useState(false);

  const handlePrint = () => {
    printElement(printAreaId, printFilename);
  };

  const handleCopy = async () => {
    if (copying) return;
    setCopying(true);
    try {
      const result = await copyElementAsImage(printAreaId, printFilename);
      if (result === 'copied') {
        await showSuccess(t('print.copySuccess'), t('print.copySuccessHint'));
      } else if (result === 'shared') {
        await showSuccess(t('print.shareSuccess'));
      } else {
        await showSuccess(t('print.downloadSuccess'), t('print.downloadSuccessHint'));
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      await showError(
        t('print.copyFail'),
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setCopying(false);
    }
  };

  return (
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-center justify-center bg-slate-900/60 p-2 backdrop-blur-xs sm:p-4`}
    >
      <div className="bento-card flex max-h-[min(100dvh,100%)] w-full max-w-md flex-col overflow-hidden p-0">
        <div className="no-print flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <div className="shrink-0 rounded-xl bg-blue-50 p-2 text-blue-600">
              <Icon className="h-5 w-5" />
            </div>
            <h3 className="truncate text-sm font-bold tracking-tight text-slate-900">
              {title}
            </h3>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={handleCopy}
              disabled={copying}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 sm:px-3"
            >
              <Copy className="h-4 w-4" />
              <span>{copying ? '…' : t('print.copy')}</span>
            </button>
            <button
              type="button"
              onClick={handlePrint}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-2.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-500 sm:px-3"
            >
              <Printer className="h-4 w-4" />
              <span>{t('invoices.print')}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-xl bg-slate-100 px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 sm:px-3"
            >
              {t('common.close')}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="cursor-pointer rounded-lg p-1.5 text-slate-400 hover:text-slate-800"
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain bg-slate-100 px-3 py-3 sm:px-4 sm:py-4">
          <div className="mx-auto w-full max-w-[80mm]">{children}</div>
        </div>
      </div>
    </div>
  );
};

interface PosReceiptProps {
  id: string;
  agencyName: string;
  contactLine?: string;
  logoData?: string | null;
  badge?: string;
  dateLabel?: string;
  title: string;
  subtitle?: string;
  fields: PosField[];
  amountLabel?: string;
  amountValue?: string;
  status?: string;
  notes?: string;
  notesLabel?: string;
  extraRows?: PosField[];
  footerLeft?: string;
  footerRight?: string;
}

/** Thermal / POS style receipt body — label | value columns. */
export const PosReceipt: React.FC<PosReceiptProps> = ({
  id,
  agencyName,
  contactLine,
  logoData,
  badge,
  dateLabel,
  title,
  subtitle,
  fields,
  amountLabel,
  amountValue,
  status,
  notes,
  notesLabel = 'Notes',
  extraRows,
  footerLeft = 'Prepared By',
  footerRight = 'Authorized',
}) => (
  <div
    id={id}
    className="print-target pos-receipt w-full bg-white px-3 py-4 font-mono text-[11px] leading-snug text-slate-900"
  >
    <div className="border-b border-dashed border-slate-400 pb-2 text-center">
      {logoData ? (
        <img
          src={logoData}
          alt=""
          className="mx-auto mb-1 h-10 w-10 object-contain"
        />
      ) : null}
      <p className="font-sans text-sm font-bold tracking-wide uppercase">{agencyName}</p>
      {contactLine ? (
        <p className="mt-0.5 break-words font-sans text-[9px] text-slate-600">{contactLine}</p>
      ) : null}
      {badge ? (
        <p className="mt-1 font-sans text-[9px] font-bold tracking-widest uppercase">{badge}</p>
      ) : null}
      {dateLabel ? (
        <p className="mt-0.5 font-sans text-[9px] text-slate-500">{dateLabel}</p>
      ) : null}
    </div>

    <div className="border-b border-dashed border-slate-400 py-2 text-center">
      <p className="font-sans text-xs font-bold">{title}</p>
      {subtitle ? (
        <p className="mt-0.5 break-all font-sans text-[9px] text-slate-600">{subtitle}</p>
      ) : null}
    </div>

    <div className="border-b border-dashed border-slate-400 py-1.5">
      {fields.map((f) => (
        <div
          key={`${f.label}-${f.value}`}
          className="flex items-start justify-between gap-2 py-0.5"
        >
          <span className="max-w-[42%] shrink-0 break-words font-sans text-slate-600">
            {f.label}
          </span>
          <span className="min-w-0 flex-1 text-right font-sans font-semibold break-words">
            {f.value || '—'}
          </span>
        </div>
      ))}
    </div>

    {(amountValue || status) && (
      <div className="border-b border-dashed border-slate-400 py-2">
        {amountValue ? (
          <div className="flex items-start justify-between gap-2">
            <span className="font-sans font-bold uppercase">{amountLabel || 'Amount'}</span>
            <span className="text-right font-sans text-sm font-bold">{amountValue}</span>
          </div>
        ) : null}
        {status ? (
          <div className="mt-1 flex items-start justify-between gap-2">
            <span className="font-sans text-slate-600">Status</span>
            <span className="text-right font-sans font-semibold">{status}</span>
          </div>
        ) : null}
      </div>
    )}

    {extraRows && extraRows.length > 0 ? (
      <div className="border-b border-dashed border-slate-400 py-1.5">
        {extraRows.map((f) => (
          <div
            key={`extra-${f.label}-${f.value}`}
            className="flex items-start justify-between gap-2 py-0.5"
          >
            <span className="max-w-[42%] shrink-0 break-words font-sans text-slate-600">
              {f.label}
            </span>
            <span className="min-w-0 flex-1 text-right font-sans font-semibold break-words">
              {f.value || '—'}
            </span>
          </div>
        ))}
      </div>
    ) : null}

    {notes ? (
      <div className="border-b border-dashed border-slate-400 py-1.5 font-sans text-[10px]">
        <p className="font-bold text-slate-700">{notesLabel}:</p>
        <p className="mt-0.5 break-words whitespace-pre-wrap text-slate-600">{notes}</p>
      </div>
    ) : null}

    <div className="flex items-end justify-between gap-4 pt-6 font-sans text-[9px] text-slate-500">
      <div className="flex-1 text-center">
        <div className="mx-auto mb-1 w-full max-w-[100px] border-b border-slate-400" />
        <span>{footerLeft}</span>
      </div>
      <div className="flex-1 text-center">
        <div className="mx-auto mb-1 w-full max-w-[100px] border-b border-slate-400" />
        <span>{footerRight}</span>
      </div>
    </div>
  </div>
);
