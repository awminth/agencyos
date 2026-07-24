import React from 'react';
import { FileSpreadsheet, FileText } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface ExportButtonsProps {
  onExcel: () => void;
  onPdf: () => void;
  className?: string;
  disabled?: boolean;
}

export const ExportButtons: React.FC<ExportButtonsProps> = ({
  onExcel,
  onPdf,
  className = '',
  disabled = false,
}) => {
  const { t } = useLanguage();

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={onExcel}
        className="hidden cursor-pointer items-center gap-1.5 rounded-xl bg-emerald-600 px-3.5 py-2 text-xs font-semibold text-white shadow-xs transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-50 md:inline-flex"
      >
        <FileSpreadsheet className="h-3.5 w-3.5" />
        {t('export.excel')}
      </button>
      <button
        type="button"
        disabled={disabled}
        onClick={onPdf}
        className="inline-flex cursor-pointer items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
      >
        <FileText className="h-3.5 w-3.5" />
        {t('export.pdf')}
      </button>
    </div>
  );
};
