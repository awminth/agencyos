import React, { useMemo, useState } from 'react';
import { Student, WorkerStatus, AuthUser } from '../types';
import { Search, Plus, GraduationCap, AlertOctagon, Edit, Trash2, Eye, Receipt } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { TablePagination, usePagination } from './TablePagination';
import { ExportButtons } from './ExportButtons';
import { exportToExcel, exportToPDF } from '../utils/exportUtils';
import { can } from '../utils/permissions';
import { MobileFilterToggle } from './MobileFilterToggle';
import { MobileMeta } from './MobileMeta';

interface StudentManagementProps {
  students: Student[];
  currentUser: AuthUser;
  onOpenAddModal: () => void;
  onOpenEditModal: (student: Student) => void;
  onDeleteStudent: (id: string) => void;
  onStatusChange: (student: Student, newStatus: WorkerStatus) => void;
  onSelectStudentDetail: (student: Student) => void;
  onOpenStudentFees: (student: Student) => void;
}

export const StudentManagement: React.FC<StudentManagementProps> = ({
  students,
  currentUser,
  onOpenAddModal,
  onOpenEditModal,
  onDeleteStudent,
  onStatusChange,
  onSelectStudentDetail,
  onOpenStudentFees,
}) => {
  const { t } = useLanguage();
  const canCreate = can(currentUser.permissions, 'students', 'create');
  const canUpdate = can(currentUser.permissions, 'students', 'update');
  const canDelete = can(currentUser.permissions, 'students', 'delete');

  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [visaFilter, setVisaFilter] = useState<string>('ALL');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [abscondedModalStudent, setAbscondedModalStudent] = useState<Student | null>(null);
  const [abscondedDateInput, setAbscondedDateInput] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [abscondedNoteInput, setAbscondedNoteInput] = useState<string>('');

  const filteredStudents = useMemo(() => {
    return students.filter((student) => {
      const q = searchTerm.toLowerCase().trim();
      const matchesSearch =
        !q ||
        student.name.toLowerCase().includes(q) ||
        student.serialNo.toLowerCase().includes(q) ||
        student.passportNo.toLowerCase().includes(q) ||
        student.deployment.hostCompany.toLowerCase().includes(q) ||
        student.deployment.supervisingOrg.toLowerCase().includes(q) ||
        (student.notes || '').toLowerCase().includes(q);

      const matchesStatus = statusFilter === 'ALL' || student.status === statusFilter;
      const matchesVisa = visaFilter === 'ALL' || student.deployment.visaType === visaFilter;
      return matchesSearch && matchesStatus && matchesVisa;
    });
  }, [students, searchTerm, statusFilter, visaFilter]);

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
  } = usePagination(filteredStudents, 10);

  const handleConfirmAbsconded = () => {
    if (!abscondedModalStudent) return;
    onStatusChange(
      {
        ...abscondedModalStudent,
        abscondedDate: abscondedDateInput,
        notes: abscondedNoteInput || abscondedModalStudent.notes,
      },
      'Absconded'
    );
    setAbscondedModalStudent(null);
    setAbscondedNoteInput('');
  };

  const handleExcel = () => {
    const headers = [
      t('reports.colSerial'),
      t('reports.colWorkerName'),
      'Gender',
      'DOB',
      t('reports.colPassport'),
      t('common.status'),
      t('deployments.colVisa'),
      t('students.schoolName'),
      t('students.schoolAddress'),
      t('workerModal.notes'),
    ];
    const rows = filteredStudents.map((student) => [
      student.serialNo,
      student.name,
      student.gender,
      student.dob,
      student.passportNo,
      student.status,
      student.deployment.visaType,
      student.deployment.supervisingOrg || '',
      student.deployment.hostCompany || '',
      student.notes || '',
    ]);
    exportToExcel('Students_Export', 'Students', headers, rows, { title: t('students.title') });
  };

  const handlePdf = () => {
    const headers = [
      t('reports.colSerial'),
      t('reports.colWorkerName'),
      t('reports.colPassport'),
      t('common.status'),
      t('deployments.colVisa'),
      t('students.schoolName'),
    ];
    const rows = filteredStudents.map((student) => [
      `${student.name} (${student.gender === 'Male' ? t('common.male') : t('common.female')})`,
      student.serialNo,
      student.passportNo,
      student.status,
      student.deployment.visaType,
      student.deployment.supervisingOrg || '',
    ]);
    exportToPDF(t('students.title'), headers, rows, { subtitle: t('students.subtitle') });
  };

  const activeFilterCount =
    (statusFilter !== 'ALL' ? 1 : 0) +
    (visaFilter !== 'ALL' ? 1 : 0) +
    (searchTerm.trim() ? 1 : 0);

  const statusBadge = (status: Student['status']) => (
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

  const renderActions = (student: Student) => (
    <div className="action-group">
      <button
        type="button"
        onClick={() => onSelectStudentDetail(student)}
        className="action-btn"
        title={t('common.view')}
      >
        <Eye className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        onClick={() => onOpenStudentFees(student)}
        className="action-btn action-btn-blue"
        title={t('students.openFees')}
      >
        <Receipt className="h-3.5 w-3.5" />
      </button>
      {canUpdate && (
        <button
          type="button"
          onClick={() => onOpenEditModal(student)}
          className="action-btn action-btn-blue"
          title={t('common.edit')}
        >
          <Edit className="h-3.5 w-3.5" />
        </button>
      )}
      {canUpdate && student.status === 'Active' && (
        <button
          type="button"
          onClick={() => {
            setAbscondedModalStudent(student);
            setAbscondedDateInput(new Date().toISOString().split('T')[0]);
            setAbscondedNoteInput(student.notes || '');
          }}
          className="action-btn action-btn-red"
          title={t('workers.abscondedConfirm')}
        >
          <AlertOctagon className="h-3.5 w-3.5" />
        </button>
      )}
      {canDelete && (
        <button
          type="button"
          onClick={() => onDeleteStudent(student.id)}
          className="action-btn action-btn-red"
          title={t('common.delete')}
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
              <GraduationCap className="h-5 w-5 text-blue-600" />
              <span>{t('students.title')}</span>
            </h2>
            <p className="mt-1 text-xs text-slate-500">{t('students.subtitle')}</p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <ExportButtons onExcel={handleExcel} onPdf={handlePdf} />
            {canCreate && (
              <button
                onClick={onOpenAddModal}
                className="flex cursor-pointer items-center gap-2 rounded-xl bg-blue-600 px-4 py-2 text-xs font-semibold text-white shadow-xs transition-all hover:bg-blue-500 sm:text-sm"
              >
                <Plus className="h-4 w-4" />
                <span>{t('students.add')}</span>
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
          className={`${filtersOpen ? 'grid' : 'hidden'} grid-cols-1 gap-3 pt-1 md:grid sm:grid-cols-3`}
        >
          <div className="relative">
            <Search className="absolute top-2.5 left-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder={t('students.search')}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-slate-50 py-2 pr-3 pl-9 text-xs text-slate-900 focus:border-blue-600 focus:outline-none sm:text-sm"
            />
          </div>

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

          <select
            value={visaFilter}
            onChange={(e) => setVisaFilter(e.target.value)}
            className="w-full cursor-pointer rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-800 focus:border-blue-600 focus:outline-none sm:text-sm"
          >
            <option value="ALL">{t('workers.allVisas')}</option>
            {Array.from(new Set(students.map((student) => student.deployment.visaType).filter(Boolean))).map(
              (visa) => (
                <option key={visa} value={visa}>
                  {visa}
                </option>
              )
            )}
          </select>
        </div>
      </div>

      <div className="bento-card overflow-hidden">
        <div className="divide-y divide-slate-100 md:hidden">
          {pagedItems.length === 0 ? (
            <p className="px-4 py-10 text-center text-sm text-slate-400">{t('students.empty')}</p>
          ) : (
            pagedItems.map((student) => (
              <div key={student.id} className="mobile-list-row">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">{student.name}</p>
                    <p className="mt-0.5 font-mono text-[11px] text-blue-600">{student.serialNo}</p>
                  </div>
                  {statusBadge(student.status)}
                </div>

                <MobileMeta
                  items={[
                    { label: t('reports.colPassport'), value: student.passportNo || '—' },
                    { label: t('deployments.colVisa'), value: student.deployment.visaType || '—' },
                    { label: t('students.schoolName'), value: student.deployment.supervisingOrg || '—' },
                    { label: t('students.schoolAddress'), value: student.deployment.hostCompany || '—' },
                    {
                      label: t('students.introductionFee'),
                      value: `JPY ${Number(student.financialConfig?.introductionFee || 0).toLocaleString()}`,
                    },
                  ]}
                />

                <div className="mobile-list-actions">{renderActions(student)}</div>
              </div>
            ))
          )}
        </div>

        <div className="data-table-wrap hidden md:block">
          <table className="data-table">
            <thead>
              <tr>
                <th>{t('workers.colName')}</th>
                <th>{t('workers.colPassport')}</th>
                <th>{t('deployments.colVisa')}</th>
                <th>{t('students.colSchool')}</th>
                <th className="text-right">{t('students.introductionFee')}</th>
                <th className="text-center">{t('common.status')}</th>
                <th className="text-right">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {pagedItems.length === 0 ? (
                <tr>
                  <td colSpan={7} className="empty-cell">
                    {t('students.empty')}
                  </td>
                </tr>
              ) : (
                pagedItems.map((student) => (
                  <tr key={student.id}>
                    <td>
                      <div className="cell-stack">
                        <div className="flex items-baseline gap-1.5">
                          <span className="cell-primary">{student.name}</span>
                          <span className="cell-secondary">
                            ({student.gender === 'Male' ? t('common.male') : t('common.female')})
                          </span>
                        </div>
                        <span className="cell-id">{student.serialNo}</span>
                      </div>
                    </td>
                    <td>
                      <div className="cell-stack">
                        <span className="cell-mono">{student.passportNo}</span>
                        <span className="cell-secondary">{student.dob}</span>
                      </div>
                    </td>
                    <td>
                      <span className="pill pill-blue">{student.deployment.visaType || '—'}</span>
                    </td>
                    <td>
                      <div className="cell-stack">
                        <span className="cell-primary">{student.deployment.supervisingOrg || '—'}</span>
                        <span className="cell-secondary">{student.deployment.hostCompany || '—'}</span>
                      </div>
                    </td>
                    <td className="text-right">
                      <span className="cell-mono font-semibold">
                        JPY {Number(student.financialConfig?.introductionFee || 0).toLocaleString()}
                      </span>
                    </td>
                    <td className="text-center">
                      <div className="cell-stack items-center">
                        {statusBadge(student.status)}
                        {student.status === 'Absconded' && student.abscondedDate && (
                          <span className="text-[10px] font-semibold text-red-600">
                            {t('workers.dateLabel')}: {student.abscondedDate}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="text-right">{renderActions(student)}</td>
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

      {abscondedModalStudent && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-slate-800 bg-slate-900 p-6 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3 text-red-400">
              <AlertOctagon className="h-6 w-6 shrink-0" />
              <h3 className="text-lg font-bold">{t('workers.abscondedTitle')}</h3>
            </div>

            <p className="text-xs text-slate-300">
              <strong className="text-white">
                {abscondedModalStudent.name} ({abscondedModalStudent.passportNo})
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
                onClick={() => setAbscondedModalStudent(null)}
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
