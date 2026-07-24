import React, { useMemo, useState } from 'react';
import { Invoice, InvoiceFeeType, AuthUser, Worker, InvoiceWorkerSummary } from '../types';
import { Receipt, Plus, Search, ChevronRight, Briefcase, Plane, GraduationCap } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import type { MoneyCurrency } from '../utils/currency';
import { TablePagination, usePagination } from './TablePagination';
import { ExportButtons } from './ExportButtons';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { can } from '../utils/permissions';
import { MobileFilterToggle } from './MobileFilterToggle';
import { MobileMeta } from './MobileMeta';
import { buildWorkerSummaries } from './WorkerFeeDetailModal';

interface InvoiceManagementProps {
  invoices: Invoice[];
  workers: Worker[];
  currentUser: AuthUser;
  feeTab: InvoiceFeeType;
  onFeeTabChange: (feeType: InvoiceFeeType) => void;
  onOpenCreateModal: (feeType: InvoiceFeeType, workerId?: string) => void;
  onOpenWorkerDetail: (summary: InvoiceWorkerSummary) => void;
}

const FEE_TABS: { id: InvoiceFeeType; icon: typeof Briefcase }[] = [
  { id: 'management', icon: Briefcase },
  { id: 'flight', icon: Plane },
  { id: 'training', icon: GraduationCap },
];

export const InvoiceManagement: React.FC<InvoiceManagementProps> = ({
  invoices,
  workers,
  currentUser,
  feeTab,
  onFeeTabChange,
  onOpenCreateModal,
  onOpenWorkerDetail,
}) => {
  const { t } = useLanguage();
  const { formatMoney, label: currencyLabel } = useCurrency();
  const money = (amount: number, currency?: string) =>
    formatMoney(amount, (currency as MoneyCurrency) || 'JPY');

  const canCreate = can(currentUser.permissions, 'invoices', 'create');
  const canRead = can(currentUser.permissions, 'invoices', 'read');

  const [searchTerm, setSearchTerm] = useState('');
  const [remainFilter, setRemainFilter] = useState<'ALL' | 'REMAIN' | 'PAID'>('ALL');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const workersById = useMemo(() => {
    const map: Record<string, { serialNo?: string }> = {};
    for (const w of workers) map[w.id] = { serialNo: w.serialNo };
    return map;
  }, [workers]);

  const summaries = useMemo(
    () => buildWorkerSummaries(invoices, feeTab, workersById),
    [invoices, feeTab, workersById]
  );

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return summaries.filter((s) => {
      const matchSearch =
        !q ||
        s.workerName.toLowerCase().includes(q) ||
        s.passportNo.toLowerCase().includes(q) ||
        s.hostCompany.toLowerCase().includes(q) ||
        (s.serialNo || '').toLowerCase().includes(q);
      const matchRemain =
        remainFilter === 'ALL' ||
        (remainFilter === 'REMAIN' && s.remainAmount > 0) ||
        (remainFilter === 'PAID' && s.remainAmount <= 0 && s.totalAmount > 0);
      return matchSearch && matchRemain;
    });
  }, [summaries, searchTerm, remainFilter]);

  const {
    page,
    setPage,
    pageSize,
    setPageSize,
    totalPages,
    pagedItems,
    from,
    to,
    total,
  } = usePagination(filtered, 10);

  const activeFilterCount =
    (searchTerm.trim() ? 1 : 0) + (remainFilter !== 'ALL' ? 1 : 0);

  const feeLabel = (ft: InvoiceFeeType) =>
    ft === 'flight'
      ? t('workerModal.flightFee')
      : ft === 'training'
        ? t('workerModal.trainingFee')
        : t('workerModal.managementFee');

  const exportHeaders = [
    'Worker',
    'Serial',
    'Passport',
    'Host',
    'Fee Type',
    `Total (${currencyLabel})`,
    `Paid (${currencyLabel})`,
    `Remain (${currencyLabel})`,
    'Invoices',
  ];
  const exportRows = filtered.map((s) => [
    s.workerName,
    s.serialNo || '',
    s.passportNo,
    s.hostCompany,
    feeLabel(s.feeType),
    money(s.totalAmount),
    money(s.totalPaid),
    money(s.remainAmount),
    s.invoiceCount,
  ]);

  if (!canRead) return null;

  return (
    <div className="space-y-5">
      <div className="bento-card space-y-4 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900">
              <Receipt className="h-5 w-5 text-blue-600" />
              <span>{t('invoices.title')}</span>
            </h2>
            <p className="mt-1 text-xs text-slate-500">{t('invoices.subtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ExportButtons
              onExcel={() =>
                exportToExcel('Invoices_By_Worker', 'Invoices', exportHeaders, exportRows, {
                  title: `${t('invoices.title')} — ${feeLabel(feeTab)}`,
                })
              }
              onPdf={() =>
                exportToPDF(`${t('invoices.title')} — ${feeLabel(feeTab)}`, exportHeaders, exportRows, {
                  subtitle: t('invoices.subtitle'),
                })
              }
            />
            {canCreate && (
              <button
                type="button"
                onClick={() => onOpenCreateModal(feeTab)}
                className="flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-blue-500 sm:text-sm"
              >
                <Plus className="h-4 w-4" />
                <span>{t('invoices.add')}</span>
              </button>
            )}
          </div>
        </div>

        <div className="-mx-1 flex flex-nowrap gap-2 overflow-x-auto px-1 pb-1 md:flex-wrap">
          {FEE_TABS.map(({ id, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => onFeeTabChange(id)}
              className={`inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-semibold transition sm:text-sm ${
                feeTab === id
                  ? 'bg-blue-600 text-white shadow-xs'
                  : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
              }`}
            >
              <Icon className="h-4 w-4" />
              {feeLabel(id)}
            </button>
          ))}
        </div>

        <MobileFilterToggle
          open={filtersOpen}
          onToggle={() => setFiltersOpen((v) => !v)}
          activeCount={activeFilterCount}
        />

        <div
          className={`${filtersOpen ? 'grid' : 'hidden'} grid-cols-1 gap-3 pt-1 md:grid sm:grid-cols-2`}
        >
          <div className="relative">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('invoices.searchWorker')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-xs text-slate-900 focus:border-blue-600 focus:outline-none sm:text-sm"
            />
          </div>
          <select
            value={remainFilter}
            onChange={(e) => setRemainFilter(e.target.value as 'ALL' | 'REMAIN' | 'PAID')}
            className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-blue-600 focus:outline-none sm:text-sm"
          >
            <option value="ALL">{t('invoices.filterAllBalances')}</option>
            <option value="REMAIN">{t('invoices.filterHasRemain')}</option>
            <option value="PAID">{t('invoices.filterFullyPaid')}</option>
          </select>
        </div>
      </div>

      <div className="bento-card overflow-hidden">
        <div className="divide-y divide-slate-100 md:hidden">
          {pagedItems.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-400">{t('invoices.emptyWorkers')}</p>
          ) : (
            pagedItems.map((s) => (
              <button
                key={s.workerId}
                type="button"
                onClick={() => onOpenWorkerDetail(s)}
                className="mobile-list-row w-full cursor-pointer text-left"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">{s.workerName}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-blue-600">
                      {s.serialNo || s.passportNo}
                    </p>
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                </div>
                <MobileMeta
                  items={[
                    { label: t('invoices.totalAmount'), value: money(s.totalAmount) },
                    { label: t('invoices.totalPaid'), value: money(s.totalPaid) },
                    { label: t('invoices.remainAmount'), value: money(s.remainAmount) },
                    { label: t('invoices.invoiceCount'), value: String(s.invoiceCount) },
                  ]}
                />
              </button>
            ))
          )}
        </div>

        <div className="data-table-wrap hidden md:block">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('invoices.colWorker')}</th>
                    <th>{t('invoices.colHost')}</th>
                <th className="text-right">{t('invoices.totalAmount')}</th>
                <th className="text-right">{t('invoices.totalPaid')}</th>
                <th className="text-right">{t('invoices.remainAmount')}</th>
                <th className="text-center">{t('invoices.invoiceCount')}</th>
                <th className="text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {pagedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-cell">
                    {t('invoices.emptyWorkers')}
                  </td>
                </tr>
              ) : (
                pagedItems.map((s) => (
                  <tr key={s.workerId}>
                    <td>
                      <div className="cell-stack">
                        <span className="cell-primary">{s.workerName}</span>
                        <span className="cell-id">{s.serialNo || s.passportNo}</span>
                      </div>
                    </td>
                    <td>
                      <span className="cell-secondary">{s.hostCompany}</span>
                    </td>
                    <td className="text-right">
                      <span className="cell-mono">{money(s.totalAmount)}</span>
                    </td>
                    <td className="text-right">
                      <span className="cell-mono text-emerald-600">{money(s.totalPaid)}</span>
                    </td>
                    <td className="text-right">
                      <span className="cell-mono font-semibold text-amber-700">
                        {money(s.remainAmount)}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className="cell-mono">{s.invoiceCount}</span>
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => onOpenWorkerDetail(s)}
                        className="action-btn"
                        title={t('invoices.openDetail')}
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          page={page}
          pageSize={pageSize}
          total={total}
          totalPages={totalPages}
          from={from}
          to={to}
          onPageChange={setPage}
          onPageSizeChange={setPageSize}
        />
      </div>
    </div>
  );
};
