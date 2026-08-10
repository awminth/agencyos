import React, { useMemo, useState } from 'react';
import {
  StudentInvoice,
  AuthUser,
  Student,
  StudentInvoiceSchoolSummary,
} from '../types';
import { Receipt, Plus, Search, ChevronRight, GraduationCap } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useCurrency } from '../context/CurrencyContext';
import type { MoneyCurrency } from '../utils/currency';
import { TablePagination, usePagination } from './TablePagination';
import { ExportButtons } from './ExportButtons';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { can } from '../utils/permissions';
import { MobileFilterToggle } from './MobileFilterToggle';
import { MobileMeta } from './MobileMeta';
import { buildSchoolSummaries } from './StudentFeeDetailPage';
import {
  balanceTone,
  balanceRowClass,
  balanceBadgeClass,
  balanceRemainClass,
  balancePaidAmountClass,
  balanceStatusKey,
} from '../utils/invoiceBalanceUi';

interface StudentInvoiceManagementProps {
  invoices: StudentInvoice[];
  students: Student[];
  currentUser: AuthUser;
  onOpenCreateModal: (schoolName?: string) => void;
  onOpenSchoolDetail: (summary: StudentInvoiceSchoolSummary) => void;
}

export const StudentInvoiceManagement: React.FC<StudentInvoiceManagementProps> = ({
  invoices,
  students,
  currentUser,
  onOpenCreateModal,
  onOpenSchoolDetail,
}) => {
  const { t } = useLanguage();
  const { formatMoney, label: currencyLabel } = useCurrency();
  const money = (amount: number, currency?: string) =>
    formatMoney(amount, (currency as MoneyCurrency) || 'JPY');

  const canCreate = can(currentUser.permissions, 'students', 'create');
  const canRead = can(currentUser.permissions, 'students', 'read');

  const [searchTerm, setSearchTerm] = useState('');
  const [remainFilter, setRemainFilter] = useState<'ALL' | 'REMAIN' | 'PAID'>('ALL');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const summaries = useMemo(() => buildSchoolSummaries(invoices), [invoices]);

  const schoolStudentCounts = useMemo(() => {
    const map = new Map<string, number>();
    for (const student of students) {
      const school = student.deployment.supervisingOrg || '';
      if (!school) continue;
      map.set(school, (map.get(school) || 0) + 1);
    }
    return map;
  }, [students]);

  const filtered = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    return summaries.filter((summary) => {
      const matchSearch = !q || summary.schoolName.toLowerCase().includes(q);
      const matchRemain =
        remainFilter === 'ALL' ||
        (remainFilter === 'REMAIN' && summary.remainAmount > 0) ||
        (remainFilter === 'PAID' && summary.remainAmount <= 0 && summary.totalAmount > 0);
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

  const exportHeaders = [
    t('students.schoolName'),
    t('students.studentCount'),
    `Total (${currencyLabel})`,
    `Paid (${currencyLabel})`,
    `Remain (${currencyLabel})`,
    'Invoices',
  ];
  const exportRows = filtered.map((summary) => [
    summary.schoolName,
    schoolStudentCounts.get(summary.schoolName) || summary.studentCount,
    money(summary.totalAmount),
    money(summary.totalPaid),
    money(summary.remainAmount),
    summary.invoiceCount,
  ]);

  if (!canRead) return null;

  return (
    <div className="space-y-5">
      <div className="bento-card space-y-4 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900">
              <Receipt className="h-5 w-5 text-blue-600" />
              <span>{t('students.feesTitle')}</span>
            </h2>
            <p className="mt-1 text-xs text-slate-500">{t('students.feesSubtitle')}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <ExportButtons
              onExcel={() =>
                exportToExcel('Student_Introduction_Fees', 'StudentFees', exportHeaders, exportRows, {
                  title: t('students.feesTitle'),
                })
              }
              onPdf={() =>
                exportToPDF(t('students.feesTitle'), exportHeaders, exportRows, {
                  subtitle: t('students.feesSubtitle'),
                })
              }
            />
            {canCreate && (
              <button
                type="button"
                onClick={() => onOpenCreateModal()}
                className="flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-blue-500 sm:text-sm"
              >
                <Plus className="h-4 w-4" />
                <span>{t('invoices.add')}</span>
              </button>
            )}
          </div>
        </div>

        <div className="rounded-2xl border border-blue-100 bg-blue-50/60 px-4 py-3 text-xs text-slate-600">
          <div className="inline-flex items-center gap-1.5 font-semibold text-blue-700">
            <GraduationCap className="h-4 w-4" />
            {t('students.introductionFee')}
          </div>
          <p className="mt-1">{t('students.schoolInvoiceHint')}</p>
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
              placeholder={t('students.searchSchool')}
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
            <p className="px-4 py-10 text-center text-sm text-slate-400">{t('students.feesEmpty')}</p>
          ) : (
            pagedItems.map((summary) => {
              const tone = balanceTone(summary.remainAmount, summary.totalAmount);
              return (
              <button
                key={summary.schoolName}
                type="button"
                onClick={() => onOpenSchoolDetail(summary)}
                className={`mobile-list-row w-full cursor-pointer text-left ${balanceRowClass(tone)}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-sm font-bold text-slate-900">{summary.schoolName}</p>
                      <span className={`status-badge shrink-0 text-[10px] font-bold ${balanceBadgeClass(tone)}`}>
                        {t(balanceStatusKey(tone, summary.totalPaid))}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      {t('students.studentCount')}:{' '}
                      {schoolStudentCounts.get(summary.schoolName) || summary.studentCount}
                    </p>
                    {tone === 'paid' && summary.lastPaymentDate ? (
                      <p className="mt-0.5 text-[11px] font-semibold text-blue-700">
                        {t('invoices.payDate')}: {summary.lastPaymentDate}
                      </p>
                    ) : null}
                  </div>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-300" />
                </div>
                <MobileMeta
                  items={[
                    { label: t('invoices.totalAmount'), value: money(summary.totalAmount) },
                    {
                      label: t('invoices.totalPaid'),
                      value: (
                        <span className={`font-semibold ${balancePaidAmountClass(tone)}`}>
                          {money(summary.totalPaid)}
                        </span>
                      ),
                    },
                    {
                      label: t('invoices.remainAmount'),
                      value: (
                        <span className={`font-semibold ${balanceRemainClass(tone)}`}>
                          {money(summary.remainAmount)}
                        </span>
                      ),
                    },
                    { label: t('invoices.invoiceCount'), value: String(summary.invoiceCount) },
                  ]}
                />
              </button>
              );
            })
          )}
        </div>

        <div className="data-table-wrap hidden md:block">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('students.schoolName')}</th>
                <th className="text-center">{t('students.studentCount')}</th>
                <th className="text-right">{t('invoices.totalAmount')}</th>
                <th className="text-right">{t('invoices.totalPaid')}</th>
                <th className="text-right">{t('invoices.remainAmount')}</th>
                <th className="text-center">{t('common.status')}</th>
                <th className="text-center">{t('invoices.payDate')}</th>
                <th className="text-center">{t('invoices.invoiceCount')}</th>
                <th className="text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {pagedItems.length === 0 ? (
                <tr>
                  <td colSpan={9} className="empty-cell">
                    {t('students.feesEmpty')}
                  </td>
                </tr>
              ) : (
                pagedItems.map((summary) => {
                  const tone = balanceTone(summary.remainAmount, summary.totalAmount);
                  return (
                  <tr key={summary.schoolName} className={balanceRowClass(tone)}>
                    <td>
                      <span className="cell-primary">{summary.schoolName}</span>
                    </td>
                    <td className="text-center">
                      <span className="cell-mono">
                        {schoolStudentCounts.get(summary.schoolName) || summary.studentCount}
                      </span>
                    </td>
                    <td className="text-right">
                      <span className="cell-mono">{money(summary.totalAmount)}</span>
                    </td>
                    <td className="text-right">
                      <span className={`cell-mono font-semibold ${balancePaidAmountClass(tone)}`}>
                        {money(summary.totalPaid)}
                      </span>
                    </td>
                    <td className="text-right">
                      <span className={`cell-mono font-semibold ${balanceRemainClass(tone)}`}>
                        {money(summary.remainAmount)}
                      </span>
                    </td>
                    <td className="text-center">
                      <span className={`status-badge inline-block font-bold ${balanceBadgeClass(tone)}`}>
                        {t(balanceStatusKey(tone, summary.totalPaid))}
                      </span>
                    </td>
                    <td className="text-center">
                      {tone === 'paid' && summary.lastPaymentDate ? (
                        <span className="cell-mono font-semibold text-blue-700">
                          {summary.lastPaymentDate}
                        </span>
                      ) : (
                        <span className="cell-secondary">—</span>
                      )}
                    </td>
                    <td className="text-center">
                      <span className="cell-mono">{summary.invoiceCount}</span>
                    </td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => onOpenSchoolDetail(summary)}
                        className="action-btn"
                        title={t('invoices.openDetail')}
                      >
                        <ChevronRight className="h-3.5 w-3.5" />
                      </button>
                    </td>
                  </tr>
                  );
                })
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
