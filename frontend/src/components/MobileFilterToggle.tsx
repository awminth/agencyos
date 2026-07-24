import React from 'react';
import { ChevronDown, SlidersHorizontal } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface MobileFilterToggleProps {
  open: boolean;
  onToggle: () => void;
  activeCount?: number;
}

/** Phone-only control to expand/collapse search & filters. */
export const MobileFilterToggle: React.FC<MobileFilterToggleProps> = ({
  open,
  onToggle,
  activeCount = 0,
}) => {
  const { t } = useLanguage();

  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex w-full cursor-pointer items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-700 transition hover:bg-slate-100 md:hidden dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
      aria-expanded={open}
    >
      <span className="inline-flex items-center gap-2">
        <SlidersHorizontal className="h-4 w-4 text-blue-600" />
        {open ? t('common.hideFilters') : t('common.showFilters')}
        {activeCount > 0 && (
          <span className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-blue-600 px-1.5 py-0.5 text-[10px] font-bold text-white">
            {activeCount}
          </span>
        )}
      </span>
      <ChevronDown
        className={`h-4 w-4 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
      />
    </button>
  );
};
