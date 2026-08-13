import React, { useState } from 'react';
import { Copy, FileDown, X, type LucideIcon } from 'lucide-react';
import { copyElementAsImage, downloadElementAsPdf } from '../utils/exportUtils';
import { showError, showSuccess } from '../utils/swal';
import { useLanguage } from '../context/LanguageContext';

interface DocumentSharePreviewProps {
  title: string;
  subtitle?: string;
  printAreaId: string;
  printFilename: string;
  icon: LucideIcon;
  onClose: () => void;
  children: React.ReactNode;
  zIndexClass?: string;
  /** Extra controls above the document (e.g. voucher slot tabs) */
  toolbar?: React.ReactNode;
}

/** Wide digital-share modal — Copy image + PDF download (not POS thermal). */
export const DocumentSharePreview: React.FC<DocumentSharePreviewProps> = ({
  title,
  subtitle,
  printAreaId,
  printFilename,
  icon: Icon,
  onClose,
  children,
  zIndexClass = 'z-50',
  toolbar,
}) => {
  const { t } = useLanguage();
  const [busy, setBusy] = useState<'copy' | 'pdf' | null>(null);

  const handleCopy = async () => {
    if (busy) return;
    setBusy('copy');
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
      setBusy(null);
    }
  };

  const handlePdf = async () => {
    if (busy) return;
    setBusy('pdf');
    try {
      await downloadElementAsPdf(printAreaId, printFilename);
      await showSuccess(t('print.pdfSuccess'), t('print.pdfSuccessHint'));
    } catch (err) {
      await showError(
        t('print.pdfFail'),
        err instanceof Error ? err.message : undefined
      );
    } finally {
      setBusy(null);
    }
  };

  return (
    <div
      className={`fixed inset-0 ${zIndexClass} flex items-center justify-center bg-slate-900/60 p-2 backdrop-blur-xs sm:p-4`}
    >
      <div className="bento-card flex max-h-[min(100dvh,100%)] w-full max-w-3xl flex-col overflow-hidden p-0">
        <div className="no-print flex shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 py-3 sm:px-4">
          <div className="flex min-w-0 items-center gap-2">
            <div className="shrink-0 rounded-xl bg-blue-50 p-2 text-blue-600">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-sm font-bold tracking-tight text-slate-900">
                {title}
              </h3>
              {subtitle ? (
                <p className="truncate font-mono text-[11px] text-slate-500">{subtitle}</p>
              ) : null}
            </div>
          </div>

          <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">
            <button
              type="button"
              onClick={handleCopy}
              disabled={!!busy}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-2.5 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60 sm:px-3"
            >
              <Copy className="h-4 w-4" />
              <span>{busy === 'copy' ? '…' : t('print.copy')}</span>
            </button>
            <button
              type="button"
              onClick={handlePdf}
              disabled={!!busy}
              className="flex cursor-pointer items-center gap-1.5 rounded-xl bg-blue-600 px-2.5 py-2 text-xs font-semibold text-white shadow-xs hover:bg-blue-500 disabled:opacity-60 sm:px-3"
            >
              <FileDown className="h-4 w-4" />
              <span>{busy === 'pdf' ? '…' : t('print.pdf')}</span>
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
          {toolbar ? <div className="no-print mx-auto mb-3 w-full max-w-[210mm]">{toolbar}</div> : null}
          <div className="mx-auto w-full max-w-[210mm] overflow-hidden rounded-lg border border-slate-200">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
