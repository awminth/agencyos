import React, { useEffect, useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

const PAGE_SIZE_OPTIONS = [5, 10, 20, 50];

export function usePagination<T>(items: T[], defaultPageSize = 10) {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(defaultPageSize);

  useEffect(() => {
    setPage(1);
  }, [items.length, pageSize]);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  useEffect(() => {
    if (page > totalPages) setPage(totalPages);
  }, [page, totalPages]);

  const pagedItems = useMemo(() => {
    const start = (page - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, page, pageSize]);

  const from = items.length === 0 ? 0 : (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, items.length);

  return {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    pagedItems,
    from,
    to,
    total: items.length,
  };
}

interface TablePaginationProps {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  from: number;
  to: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  /** top = above table; bottom = below table (default) */
  placement?: 'top' | 'bottom';
}

export const TablePagination: React.FC<TablePaginationProps> = ({
  page,
  pageSize,
  total,
  totalPages,
  from,
  to,
  onPageChange,
  onPageSizeChange,
  placement = 'bottom',
}) => {
  const { t } = useLanguage();
  const edge =
    placement === 'top'
      ? 'border-b border-slate-200'
      : 'border-t border-slate-200';

  return (
    <div
      className={`flex flex-col gap-3 bg-slate-50 px-4 py-3.5 sm:flex-row sm:items-center sm:justify-between ${edge}`}
    >
      <div className="flex flex-wrap items-center gap-2.5 text-xs text-slate-600">
        <label className="flex items-center gap-2 font-semibold text-slate-700">
          <span>{t('pagination.rowsPerPage')}</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="cursor-pointer rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-semibold text-slate-800 shadow-xs focus:border-blue-600 focus:outline-none"
          >
            {PAGE_SIZE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>
        <span className="hidden h-4 w-px bg-slate-200 sm:block" />
        <span>
          {t('pagination.showing')}{' '}
          <strong className="tabular-nums text-slate-900">
            {from}-{to}
          </strong>{' '}
          {t('pagination.of')} <strong className="tabular-nums text-slate-900">{total}</strong>
        </span>
      </div>

      <div className="flex items-center gap-2">
        <button
          type="button"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <ChevronLeft className="h-3.5 w-3.5" />
          {t('pagination.previous')}
        </button>
        <span className="min-w-[5.5rem] text-center text-xs font-semibold tabular-nums text-slate-600">
          {t('pagination.page')} {page}/{totalPages}
        </span>
        <button
          type="button"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
          className="inline-flex cursor-pointer items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 shadow-xs transition hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {t('pagination.next')}
          <ChevronRight className="h-3.5 w-3.5" />
        </button>
      </div>
    </div>
  );
};
