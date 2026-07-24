import React, { useMemo, useState } from 'react';
import { Worker, WorkerStatus, AuthUser } from '../types';
import {
  Search,
  Plus,
  UserCheck,
  PlaneTakeoff,
  AlertOctagon,
  Edit,
  Trash2,
  Eye,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { TablePagination, usePagination } from './TablePagination';
import { ExportButtons } from './ExportButtons';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { can } from '../utils/permissions';
import { MobileFilterToggle } from './MobileFilterToggle';
import { MobileMeta } from './MobileMeta';

interface WorkerManagementProps {
  workers: Worker[];
  currentUser: AuthUser;
  viewMode?: 'workers' | 'deployments';
  onOpenAddModal: () => void;
  onOpenEditModal: (worker: Worker) => void;
  onDeleteWorker: (id: string) => void;
  onStatusChange: (worker: Worker, newStatus: WorkerStatus) => void;
  onSelectWorkerDetail: (worker: Worker) => void;
}

function daysUntil(dateStr?: string): number | null {
  if (!dateStr) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const target = new Date(dateStr);
  if (Number.isNaN(target.getTime())) return null;
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function expiryBadgeClass(days: number | null): string {
  if (days == null) return 'bg-slate-100 text-slate-600';
  if (days < 0) return 'bg-slate-200 text-slate-700';
  if (days <= 30) return 'bg-red-100 text-red-700';
  if (days <= 90) return 'bg-amber-100 text-amber-800';
  return 'bg-emerald-100 text-emerald-700';
}

export const WorkerManagement: React.FC<WorkerManagementProps> = ({
  workers,
  currentUser,
  viewMode = 'workers',
  onOpenAddModal,
  onOpenEditModal,
  onDeleteWorker,
  onStatusChange,
  onSelectWorkerDetail,
}) => {
  const { t } = useLanguage();
  const module = viewMode === 'deployments' ? 'deployments' : 'workers';
  const canCreate = can(currentUser.permissions, module, 'create');
  const canUpdate = can(currentUser.permissions, module, 'update');
  const canDelete = can(currentUser.permissions, module, 'delete');
  const canAbscond = canUpdate;

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [visaFilter, setVisaFilter] = useState<string>('ALL');
  const [expiryFilter, setExpiryFilter] = useState<string>('ALL');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [abscondedModalWorker, setAbscondedModalWorker] = useState<Worker | null>(null);
  const [abscondedDateInput, setAbscondedDateInput] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [abscondedNoteInput, setAbscondedNoteInput] = useState<string>('');

  const isDeployments = viewMode === 'deployments';
  const pageTitle = isDeployments ? t('deployments.title') : t('workers.title');
  const pageSubtitle = isDeployments ? t('deployments.subtitle') : t('workers.subtitle');
  const TitleIcon = isDeployments ? PlaneTakeoff : UserCheck;

  const filteredWorkers = useMemo(() => {
    return workers.filter((w) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        w.name.toLowerCase().includes(q) ||
        w.serialNo.toLowerCase().includes(q) ||
        w.passportNo.toLowerCase().includes(q) ||
        w.deployment.hostCompany.toLowerCase().includes(q) ||
        w.deployment.supervisingOrg.toLowerCase().includes(q) ||
        (w.notes || '').toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'ALL' || w.status === statusFilter;
      const matchesVisa = visaFilter === 'ALL' || w.deployment.visaType === visaFilter;

      if (!isDeployments) {
        return matchesSearch && matchesStatus && matchesVisa;
      }

      const days = daysUntil(w.deployment.contractEndDate);
      let matchesExpiry = true;
      if (expiryFilter === '30') matchesExpiry = days != null && days >= 0 && days <= 30;
      else if (expiryFilter === '90') matchesExpiry = days != null && days >= 0 && days <= 90;
      else if (expiryFilter === 'expired') matchesExpiry = days != null && days < 0;
      else if (expiryFilter === 'none') matchesExpiry = !w.deployment.contractEndDate;

      return matchesSearch && matchesStatus && matchesVisa && matchesExpiry;
    });
  }, [workers, searchTerm, statusFilter, visaFilter, expiryFilter, isDeployments]);

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
  } = usePagination(filteredWorkers, 10);

  const handleConfirmAbsconded = () => {
    if (!abscondedModalWorker) return;
    onStatusChange(
      {
        ...abscondedModalWorker,
        abscondedDate: abscondedDateInput,
        notes: abscondedNoteInput || abscondedModalWorker.notes,
      },
      'Absconded'
    );
    setAbscondedModalWorker(null);
    setAbscondedNoteInput('');
  };

  const buildExportRows = () => {
    if (isDeployments) {
      const headers = [
        'စဉ်',
        'အမည်',
        'Passport',
        'Visa',
        'Job Category',
        'ကြီးကြပ်ရေး',
        'Host Company',
        'Own Card',
        'Departure',
        'Japan Entry',
        'Contract End',
        'Days Remaining',
        'Status',
      ];
      const rows = filteredWorkers.map((w) => {
        const days = daysUntil(w.deployment.contractEndDate);
        return [
          w.serialNo,
          w.name,
          w.passportNo,
          w.deployment.visaType,
          w.deployment.jobCategory,
          w.deployment.supervisingOrg,
          w.deployment.hostCompany,
          w.deployment.ownCardDate || '',
          w.deployment.departureDate || '',
          w.deployment.japanEntryDate || '',
          w.deployment.contractEndDate || '',
          days == null ? '' : days,
          w.status,
        ];
      });
      return { headers, rows, fileBase: 'Deployments_Export', sheet: 'Deployments' };
    }

    const headers = [
      'စဉ်',
      'အမည်',
      'Gender',
      'DOB',
      'Passport',
      'Status',
      'Absconded Date',
      'Host Company',
      'Notes',
    ];
    const rows = filteredWorkers.map((w) => [
      w.serialNo,
      w.name,
      w.gender,
      w.dob,
      w.passportNo,
      w.status,
      w.abscondedDate || '',
      w.deployment.hostCompany || '',
      w.notes || '',
    ]);
    return { headers, rows, fileBase: 'Workers_Export', sheet: 'Workers' };
  };

  const handleExcel = () => {
    const { headers, rows, fileBase, sheet } = buildExportRows();
    exportToExcel(fileBase, sheet, headers, rows, { title: pageTitle });
  };

  const handlePdf = () => {
    const { headers, rows } = buildExportRows();
    exportToPDF(pageTitle, headers, rows, { subtitle: pageSubtitle });
  };

  const activeFilterCount =
    (statusFilter !== 'ALL' ? 1 : 0) +
    (searchTerm.trim() ? 1 : 0) +
    (isDeployments && visaFilter !== 'ALL' ? 1 : 0) +
    (isDeployments && expiryFilter !== 'ALL' ? 1 : 0);

  const statusBadge = (status: Worker['status']) => (
    <span
      className={`status-badge inline-block ${
        status === 'Active'
          ? 'bg-emerald-100 text-emerald-700'
          : status === 'Contract Ended'
            ? 'bg-slate-100 text-slate-600'
            : 'bg-red-100 text-red-700'
      }`}
    >
      {status}
    </span>
  );

  const renderActions = (w: Worker) => (
    <div className="action-group">
      <button
        type="button"
        onClick={() => onSelectWorkerDetail(w)}
        className="action-btn"
        title="Details"
      >
        <Eye className="h-3.5 w-3.5" />
      </button>
      {canUpdate && (
        <button
          type="button"
          onClick={() => onOpenEditModal(w)}
          className="action-btn action-btn-blue"
          title="Edit"
        >
          <Edit className="h-3.5 w-3.5" />
        </button>
      )}
      {!isDeployments && canAbscond && w.status === 'Active' && (
        <button
          type="button"
          onClick={() => {
            setAbscondedModalWorker(w);
            setAbscondedDateInput(new Date().toISOString().split('T')[0]);
            setAbscondedNoteInput(w.notes || '');
          }}
          className="action-btn action-btn-red"
          title="Mark Absconded"
        >
          <AlertOctagon className="h-3.5 w-3.5" />
        </button>
      )}
      {!isDeployments && canDelete && (
        <button
          type="button"
          onClick={() => onDeleteWorker(w.id)}
          className="action-btn action-btn-red"
          title="Delete"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );

  return (
    <div className="space-y-5">
      <div className="bento-card space-y-4 p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="flex items-center gap-2 text-xl font-bold tracking-tight text-slate-900">
              <TitleIcon className={`h-5 w-5 ${isDeployments ? 'text-amber-600' : 'text-blue-600'}`} />
              <span>{pageTitle}</span>
            </h2>
            <p className="mt-1 text-xs text-slate-500">{pageSubtitle}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ExportButtons onExcel={handleExcel} onPdf={handlePdf} />
            {!isDeployments && canCreate && (
              <button
                onClick={onOpenAddModal}
                className="flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-blue-500 sm:text-sm"
              >
                <Plus className="h-4 w-4" />
                <span>{t('workers.add')}</span>
              </button>
            )}
          </div>
        </div>

        <MobileFilterToggle
          open={filtersOpen}
          onToggle={() => setFiltersOpen((v) => !v)}
          activeCount={activeFilterCount}
        />

        <div
          className={`${filtersOpen ? 'grid' : 'hidden'} grid-cols-1 gap-3 pt-1 md:grid ${
            isDeployments ? 'sm:grid-cols-2 lg:grid-cols-4' : 'sm:grid-cols-2'
          }`}
        >
          <div className="relative">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={
                isDeployments ? t('deployments.search') : t('workers.search')
              }
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-xs text-slate-900 focus:border-blue-600 focus:outline-none sm:text-sm"
            />
          </div>

          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-blue-600 focus:outline-none sm:text-sm"
            >
              <option value="ALL">{t('common.allStatuses')}</option>
              <option value="Active">Active</option>
              <option value="Contract Ended">Contract Ended</option>
              <option value="Absconded">Absconded</option>
            </select>
          </div>

          {isDeployments && (
            <>
              <div>
                <select
                  value={visaFilter}
                  onChange={(e) => setVisaFilter(e.target.value)}
                  className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-blue-600 focus:outline-none sm:text-sm"
                >
                  <option value="ALL">{t('workers.allVisas')}</option>
                  <option value="TITP-1">TITP-1</option>
                  <option value="TITP-2">TITP-2</option>
                  <option value="TITP-3">TITP-3</option>
                  <option value="SSW-Caregiver">SSW-Caregiver</option>
                  <option value="SSW-Construction">SSW-Construction</option>
                  <option value="SSW-Food Processing">SSW-Food Processing</option>
                  <option value="SSW-Manufacturing">SSW-Manufacturing</option>
                  <option value="SSW-Agriculture">SSW-Agriculture</option>
                  <option value="Engineering/Humanities">Engineering/Humanities</option>
                </select>
              </div>
              <div>
                <select
                  value={expiryFilter}
                  onChange={(e) => setExpiryFilter(e.target.value)}
                  className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-blue-600 focus:outline-none sm:text-sm"
                >
                  <option value="ALL">{t('deployments.allExpiry')}</option>
                  <option value="30">{t('deployments.expiry30')}</option>
                  <option value="90">{t('deployments.expiry90')}</option>
                  <option value="expired">{t('deployments.expiryPast')}</option>
                  <option value="none">{t('deployments.expiryNone')}</option>
                </select>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="bento-card overflow-hidden">
        {/* Mobile list */}
        <div className="divide-y divide-slate-100 md:hidden">
          {pagedItems.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-400">
              {isDeployments ? t('deployments.empty') : t('workers.empty')}
            </p>
          ) : (
            pagedItems.map((w) => {
              const days = daysUntil(w.deployment.contractEndDate);
              return (
                <div key={w.id} className="mobile-list-row">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900">{w.name}</p>
                      <p className="mt-0.5 font-mono text-[11px] text-blue-600">{w.serialNo}</p>
                    </div>
                    {statusBadge(w.status)}
                  </div>

                  {isDeployments ? (
                    <MobileMeta
                      items={[
                        { label: t('deployments.colVisa'), value: w.deployment.visaType || '—' },
                        { label: t('deployments.colCompany'), value: w.deployment.hostCompany || '—' },
                        { label: t('deployments.colOwnCard'), value: w.deployment.ownCardDate || '—' },
                        { label: t('deployments.colDeparture'), value: w.deployment.departureDate || '—' },
                        {
                          label: t('deployments.colJapanEntry'),
                          value: w.deployment.japanEntryDate || '—',
                        },
                        {
                          label: t('deployments.colContract'),
                          value: w.deployment.contractEndDate
                            ? `${w.deployment.contractEndDate}${
                                days != null
                                  ? ` (${
                                      days < 0
                                        ? t('deployments.expiredDays', { days: Math.abs(days) })
                                        : t('deployments.daysLeft', { days })
                                    })`
                                  : ''
                              }`
                            : '—',
                        },
                      ]}
                    />
                  ) : (
                    <MobileMeta
                      items={[
                        { label: t('workers.colPassport'), value: w.passportNo || '—' },
                        {
                          label: t('workers.colHostBrief'),
                          value: w.deployment.hostCompany || '—',
                        },
                        {
                          label: t('deployments.colVisa'),
                          value: w.deployment.visaType || '—',
                        },
                        {
                          label: t('workers.notes'),
                          value: w.notes?.trim() ? w.notes : '—',
                        },
                      ]}
                    />
                  )}

                  <div className="mobile-list-actions">{renderActions(w)}</div>
                </div>
              );
            })
          )}
        </div>

        {/* Desktop table */}
        <div className="data-table-wrap hidden md:block">
          <table className="data-table">
            <thead>
              {isDeployments ? (
                <tr>
                  <th>{t('workers.colName')}</th>
                  <th>{t('deployments.colVisa')}</th>
                  <th>{t('deployments.colCompany')}</th>
                  <th>{t('deployments.colOwnCard')}</th>
                  <th>{t('deployments.colDeparture')}</th>
                  <th>{t('deployments.colJapanEntry')}</th>
                  <th>{t('deployments.colContract')}</th>
                  <th className="text-center">{t('common.status')}</th>
                  <th className="text-right">{t('common.actions')}</th>
                </tr>
              ) : (
                <tr>
                  <th>{t('workers.colName')}</th>
                  <th>{t('workers.colPassport')}</th>
                  <th className="text-center">{t('common.status')}</th>
                  <th>{t('workers.colHostBrief')}</th>
                  <th>{t('workers.notes')}</th>
                  <th className="text-right">{t('common.actions')}</th>
                </tr>
              )}
            </thead>
            <tbody>
              {pagedItems.length === 0 ? (
                <tr>
                  <td colSpan={isDeployments ? 9 : 6} className="empty-cell">
                    {isDeployments ? t('deployments.empty') : t('workers.empty')}
                  </td>
                </tr>
              ) : isDeployments ? (
                pagedItems.map((w) => {
                  const days = daysUntil(w.deployment.contractEndDate);
                  return (
                    <tr key={w.id}>
                      <td>
                        <div className="cell-stack">
                          <span className="cell-primary">{w.name}</span>
                          <span className="cell-id">{w.serialNo}</span>
                        </div>
                      </td>
                      <td>
                        <div className="cell-stack">
                          <span className="pill pill-blue">{w.deployment.visaType}</span>
                          <span className="cell-secondary max-w-[160px] truncate">
                            {w.deployment.jobCategory}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="cell-stack max-w-[200px]">
                          <span className="cell-primary truncate">
                            {w.deployment.hostCompany}
                          </span>
                          <span className="cell-secondary truncate">
                            {w.deployment.supervisingOrg}
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="cell-mono">
                          {w.deployment.ownCardDate || '—'}
                        </span>
                      </td>
                      <td>
                        <span className="cell-mono">
                          {w.deployment.departureDate || '—'}
                        </span>
                      </td>
                      <td>
                        <span className="cell-mono">
                          {w.deployment.japanEntryDate || '—'}
                        </span>
                      </td>
                      <td>
                        <div className="cell-stack">
                          <span className="cell-mono font-semibold">
                            {w.deployment.contractEndDate || 'N/A'}
                          </span>
                          {days != null && (
                            <span
                              className={`status-badge inline-block text-[10px] ${expiryBadgeClass(days)}`}
                            >
                              {days < 0
                                ? t('deployments.expiredDays', { days: Math.abs(days) })
                                : t('deployments.daysLeft', { days })}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="text-center">{statusBadge(w.status)}</td>
                      <td className="text-right">{renderActions(w)}</td>
                    </tr>
                  );
                })
              ) : (
                pagedItems.map((w) => (
                  <tr key={w.id}>
                    <td>
                      <div className="cell-stack">
                        <div className="flex items-baseline gap-1.5">
                          <span className="cell-primary">{w.name}</span>
                          <span className="cell-secondary">
                            ({w.gender === 'Male' ? t('common.male') : t('common.female')})
                          </span>
                        </div>
                        <span className="cell-id">{w.serialNo}</span>
                      </div>
                    </td>
                    <td>
                      <div className="cell-stack">
                        <span className="cell-mono">{w.passportNo}</span>
                        <span className="cell-secondary">{w.dob}</span>
                      </div>
                    </td>
                    <td className="text-center">
                      <div className="cell-stack items-center">
                        {statusBadge(w.status)}
                        {w.status === 'Absconded' && w.abscondedDate && (
                          <span className="text-[10px] font-semibold text-red-600">
                            {t('workers.dateLabel')}: {w.abscondedDate}
                          </span>
                        )}
                      </div>
                    </td>
                    <td>
                      <span className="cell-secondary max-w-[180px] truncate block">
                        {w.deployment.hostCompany || '—'}
                      </span>
                    </td>
                    <td>
                      <span className="cell-secondary max-w-[220px] truncate block">
                        {w.notes || '—'}
                      </span>
                    </td>
                    <td className="text-right">{renderActions(w)}</td>
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

      {abscondedModalWorker && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3 text-red-400">
              <AlertOctagon className="h-6 w-6 shrink-0" />
              <h3 className="text-lg font-bold">{t('workers.abscondedTitle')}</h3>
            </div>

            <p className="text-xs text-slate-300">
              <strong className="text-white">
                {abscondedModalWorker.name} ({abscondedModalWorker.passportNo})
              </strong>
            </p>

            <div className="space-y-3 pt-2">
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-400">
                  {t('workers.abscondedDate')} *
                </label>
                <input
                  type="date"
                  value={abscondedDateInput}
                  onChange={(e) => setAbscondedDateInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-sm text-white focus:border-red-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold text-slate-400">
                  {t('workers.notes')}
                </label>
                <textarea
                  rows={3}
                  value={abscondedNoteInput}
                  onChange={(e) => setAbscondedNoteInput(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-red-500 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end space-x-3 border-t border-slate-800 pt-4">
              <button
                onClick={() => setAbscondedModalWorker(null)}
                className="cursor-pointer rounded-xl bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleConfirmAbsconded}
                className="cursor-pointer rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white hover:bg-red-500"
              >
                {t('workers.abscondedConfirm')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
